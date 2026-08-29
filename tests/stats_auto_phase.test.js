import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { installChromeMock } from './setup/chrome_mock.ts';
import {
    isPrayerBannerText,
    areAllStreamBannersChecked,
    detectActiveBannerText,
    checkAutoStartQuestionsPhase,
    checkAutoStartPrayersPhase
} from '../modules/stats_auto_phase.ts';
import { STORAGE_KEYS } from '../modules/storage.ts';

describe('modules/stats_auto_phase.ts', () => {
    describe('isPrayerBannerText', () => {
        test('повертає true для російських та українських варіантів молитвених прохань', () => {
            assert.equal(isPrayerBannerText('молитвенные просьбы'), true);
            assert.equal(isPrayerBannerText('молитвенние просьби'), true);
            assert.equal(isPrayerBannerText('МОЛИТВЕННЫЕ ПРОСЬБЫ'), true);
            assert.equal(isPrayerBannerText('Молитвенная просьба'), true);
            assert.equal(isPrayerBannerText('Молитвенные просьбы (Тора)'), true);
            assert.equal(isPrayerBannerText('Просьбы о молитве'), true);
            assert.equal(isPrayerBannerText('Молитовні прохання'), true);
        });

        test('повертає false, коли є лише одне зі слів або зовсім інший текст', () => {
            assert.equal(isPrayerBannerText('Молитва за мир'), false);
            assert.equal(isPrayerBannerText('Просьба включить микрофон'), false);
            assert.equal(isPrayerBannerText('Субботняя школа урок 5'), false);
            assert.equal(isPrayerBannerText('Питання глядачів'), false);
            assert.equal(isPrayerBannerText(''), false);
            assert.equal(isPrayerBannerText(null), false);
            assert.equal(isPrayerBannerText(undefined), false);
        });
    });

    describe('areAllStreamBannersChecked', () => {
        beforeEach(() => {
            document.body.innerHTML = '';
        });

        test('повертає false для порожнього масиву банерів', () => {
            assert.equal(areAllStreamBannersChecked([]), false);
        });

        test('повертає true, коли всі банери з типом stream відмічені', () => {
            const b1 = document.createElement('div');
            b1.setAttribute('data-syh-banner-type', 'stream');
            b1.innerHTML = '<input type="checkbox" class="syh-checkbox" data-type="banner" checked>';

            const b2 = document.createElement('div');
            b2.setAttribute('data-syh-banner-type', 'stream');
            b2.innerHTML = '<input type="checkbox" class="syh-checkbox" data-type="banner" checked>';

            const bOther = document.createElement('div');
            bOther.setAttribute('data-syh-banner-type', 'prayer');
            bOther.innerHTML = '<input type="checkbox" class="syh-checkbox" data-type="banner">';

            assert.equal(areAllStreamBannersChecked([b1, b2, bOther]), true);
        });

        test('повертає false, якщо хоча б один банер stream не відмічений', () => {
            const b1 = document.createElement('div');
            b1.setAttribute('data-syh-banner-type', 'stream');
            b1.innerHTML = '<input type="checkbox" class="syh-checkbox" data-type="banner" checked>';

            const b2 = document.createElement('div');
            b2.setAttribute('data-syh-banner-type', 'stream');
            b2.innerHTML = '<input type="checkbox" class="syh-checkbox" data-type="banner">';

            assert.equal(areAllStreamBannersChecked([b1, b2]), false);
        });

        test('якщо типів немає, перевіряє всі банери списку', () => {
            const b1 = document.createElement('div');
            b1.innerHTML = '<input type="checkbox" class="syh-checkbox" data-type="banner" checked>';

            const b2 = document.createElement('div');
            b2.innerHTML = '<input type="checkbox" class="syh-checkbox" data-type="banner" checked>';

            assert.equal(areAllStreamBannersChecked([b1, b2]), true);

            const cb2 = b2.querySelector('input');
            cb2.checked = false;
            assert.equal(areAllStreamBannersChecked([b1, b2]), false);
        });
    });

    describe('detectActiveBannerText', () => {
        beforeEach(() => {
            document.body.innerHTML = '';
        });

        test('знаходить текст активного банера з svg.lucide-eye-off', () => {
            const wrap = document.createElement('div');
            wrap.className = 'Banner__Wrap-xyz';
            wrap.innerHTML = `
                <svg class="lucide-eye-off"></svg>
                <span class="Banner__BannerText-abc">Молитвенные просьбы</span>
            `;
            document.body.appendChild(wrap);

            assert.equal(detectActiveBannerText(document), 'Молитвенные просьбы');
        });

        test('повертає null, якщо немає активного банера', () => {
            const wrap = document.createElement('div');
            wrap.className = 'Banner__Wrap-xyz';
            wrap.innerHTML = `
                <svg class="lucide-eye"></svg>
                <span class="Banner__BannerText-abc">Молитвенные просьбы</span>
            `;
            document.body.appendChild(wrap);

            assert.equal(detectActiveBannerText(document), null);
        });
    });

    describe('checkAutoStartQuestionsPhase & checkAutoStartPrayersPhase', () => {
        let fakeHost;
        let storageDb;

        beforeEach(() => {
            document.body.innerHTML = '';
            storageDb = {};
            installChromeMock({
                storageData: { [STORAGE_KEYS.STATS_CHARTS]: storageDb }
            });
            fakeHost = {
                currentBrand: 'TestBrand',
                loadStatsDb: (cb) => cb(storageDb)
            };
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        test('checkAutoStartQuestionsPhase не спрацьовує, якщо немає таймера', () => {
            const b = document.createElement('div');
            b.innerHTML = '<input type="checkbox" class="syh-checkbox" data-type="banner" checked>';

            const triggered = checkAutoStartQuestionsPhase(fakeHost, [b]);
            assert.equal(triggered, false);
        });

        test('checkAutoStartQuestionsPhase запускає фазу, якщо є таймер і всі банери відмічені', () => {
            const timer = document.createElement('div');
            timer.className = 'Timer__TimerWrapper-test';
            timer.innerText = '00:25:30';
            document.body.appendChild(timer);

            const btnQ = document.createElement('button');
            btnQ.setAttribute('data-action', 'phase-questions');
            btnQ.innerText = '❓ Старт: Питання';
            document.body.appendChild(btnQ);

            const b = document.createElement('div');
            b.innerHTML = '<input type="checkbox" class="syh-checkbox" data-type="banner" checked>';

            const triggered = checkAutoStartQuestionsPhase(fakeHost, [b]);
            assert.equal(triggered, true);

            const today = new Date().toLocaleDateString('sv-SE');
            assert.equal(storageDb['TestBrand'][today].phase_questions_start, '00:25:30');
            assert.equal(btnQ.innerText, '✅ Питання');

            // Повторний виклик не перезаписує
            timer.innerText = '00:30:00';
            const triggeredAgain = checkAutoStartQuestionsPhase(fakeHost, [b]);
            assert.equal(triggeredAgain, false);
            assert.equal(storageDb['TestBrand'][today].phase_questions_start, '00:25:30');
        });

        test('checkAutoStartPrayersPhase запускає фазу молитов при відповідному банері', () => {
            const timer = document.createElement('div');
            timer.className = 'Timer__TimerWrapper-test';
            timer.innerText = '01:10:00';
            document.body.appendChild(timer);

            const btnP = document.createElement('button');
            btnP.setAttribute('data-action', 'phase-prayers');
            btnP.innerText = '🙏 Старт: Молитви';
            document.body.appendChild(btnP);

            const triggered = checkAutoStartPrayersPhase(fakeHost, 'Молитвенные просьбы');
            assert.equal(triggered, true);

            const today = new Date().toLocaleDateString('sv-SE');
            assert.equal(storageDb['TestBrand'][today].phase_prayers_start, '01:10:00');
            assert.equal(btnP.innerText, '✅ Молитви');

            // Повторний виклик не перезаписує
            timer.innerText = '01:15:00';
            const triggeredAgain = checkAutoStartPrayersPhase(fakeHost, 'Молитвенные просьбы');
            assert.equal(triggeredAgain, false);
            assert.equal(storageDb['TestBrand'][today].phase_prayers_start, '01:10:00');
        });
    });
});
