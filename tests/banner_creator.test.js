import test from 'node:test';
import assert from 'node:assert/strict';
import {
    detectBlockCategory,
    parseBlock,
    parseRawTextToBanners,
    executeBannerCreationLoop,
    SYH_BANNER_CREATOR
} from '../modules/banners/banner_creator.ts';
import { SYH_PARSERS } from '../modules/parsers/index.ts';
import { SYH_UTILS } from '../modules/core/utils.ts';

const mockLogger = (msg) => { };

// Mock global document for Node.js
global.document = {
    createElement: (tag) => {
        const el = {
            tagName: tag.toUpperCase(),
            innerHTML: '',
            querySelector: () => null,
            querySelectorAll: () => [],
            closest: () => null,
            click: () => {},
            focus: () => {},
            blur: () => {},
            dispatchEvent: () => true,
            value: '',
            disabled: false,
            type: '',
            id: '',
            setAttribute: () => {},
            getAttribute: () => null,
        };
        if (tag === 'form') {
            el.querySelectorAll = (sel) => {
                if (sel === 'button') {
                    return [
                        { type: 'submit', id: '', click: () => {}, closest: () => null },
                        { type: 'button', id: 'banner-timer-dropdown-button', click: () => {}, closest: () => null },
                        { type: 'button', id: '', click: () => {}, closest: () => null },
                    ];
                }
                return [];
            };
        }
        return el;
    },
    querySelector: () => null,
};

const mockParsers = {
    parseStandardNumberedQuestions: (text) => text.split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+\.\s*/, '').trim()),
    parseEmojiNumberedQuestions: (text) => text.split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+️⃣\s*/, '').trim()),
    parseSabbathSchoolUnnumberedQuestions: (text) => text.split('\n').filter(l => l.trim() && !l.includes('Урок') && !l.includes('Субботняя') && !l.includes('Памятный')).map(l => l.trim()),
};

const mockUtils = {
    cleanTelegramHeaders: (text) => text,
    saveBannerCategory: async () => { },
    copyAndShowBanner: (text, title) => { },
    waitForElement: async () => null,
    waitForNewBanner: async () => { },
};

test('detectBlockCategory - identifies prayer category', () => {
    assert.equal(detectBlockCategory('🙏🙏🙏МОЛИТВЫ', 'stream'), 'prayer');
    assert.equal(detectBlockCategory('МОЛИТВА ЗА БОЛЬНЫХ', 'stream'), 'prayer');
    assert.equal(detectBlockCategory('ПРОХАННЯ ПРО ЗДОРОВЯ', 'stream'), 'prayer');
});

test('detectBlockCategory - identifies stream (Sabbath school) category', () => {
    assert.equal(detectBlockCategory('СУББОТНЯЯ ШКОЛА УРОК 5', 'stream'), 'stream');
    assert.equal(detectBlockCategory('СУБОТНЯ ШКОЛА', 'stream'), 'stream');
    assert.equal(detectBlockCategory('УРОК 12 ПАМЯТНЫЙ СТИХ', 'stream'), 'stream');
});

test('detectBlockCategory - identifies audience category', () => {
    assert.equal(detectBlockCategory('ВОПРОСЫ ОТ ГЛЯДАЧЕЙ', 'stream'), 'audience');
    assert.equal(detectBlockCategory('ПИТАННЯ ДО СПІКЕРА', 'stream'), 'audience');
    assert.equal(detectBlockCategory('??? ВОПРОСЫ', 'stream'), 'audience');
    assert.equal(detectBlockCategory('❓ ВОПРОСЫ', 'stream'), 'audience');
});

test('detectBlockCategory - returns default for unknown', () => {
    assert.equal(detectBlockCategory('Some random text', 'default'), 'default');
    assert.equal(detectBlockCategory('', 'default'), 'default');
});

test('parseBlock - standard numbered format', () => {
    const text = `1. First question
2. Second question
3. Third question`;

    const result = parseBlock(text, 'stream', mockParsers, mockLogger);
    assert.equal(result.length, 3);
    assert.equal(result[0].text, 'First question');
    assert.equal(result[0].category, 'stream');
    assert.equal(result[0].isStandard, true);
    assert.equal(result[1].text, 'Second question');
    assert.equal(result[2].text, 'Third question');
});

test('parseBlock - emoji numbered format', () => {
    const text = `1️⃣ First question
2️⃣ Second question`;

    const result = parseBlock(text, 'stream', mockParsers, mockLogger);
    assert.equal(result.length, 2);
    assert.equal(result[0].text, 'First question');
    assert.equal(result[0].isStandard, false);
});

test('parseBlock - Sabbath school unnumbered format', () => {
    const text = `Урок 5 Субботняя школа
Памятный стих: Ин 3:16
Вопрос про веру
Вопрос про надежду`;

    const result = parseBlock(text, 'stream', mockParsers, mockLogger);
    assert.equal(result.length, 2);
    assert.equal(result[0].category, 'stream');
    assert.equal(result[0].isStandard, false);
});

test('parseBlock - empty text returns empty array', () => {
    const result = parseBlock('', 'stream', mockParsers, mockLogger);
    assert.equal(result.length, 0);
});

test('parseRawTextToBanners - splits by section headers', () => {
    const text = `❓❓❓ВОПРОСЫ
1. Question one

🙏🙏🙏МОЛИТВЫ
1. Prayer one`;

    const result = parseRawTextToBanners(text, mockParsers, mockUtils, mockLogger);
    // Split includes headers but they get filtered or parsed
    // We expect at least 2 banners (1 question + 1 prayer)
    assert.ok(result.bannersToCreate.length >= 2);
    assert.ok(result.bannersToCreate.some(b => b.category === 'audience'));
    assert.ok(result.bannersToCreate.some(b => b.category === 'prayer'));
});

test('parseRawTextToBanners - handles standard format flag', () => {
    const text = `1. Standard question
2. Another standard`;

    const result = parseRawTextToBanners(text, mockParsers, mockUtils, mockLogger);
    assert.equal(result.hasStandardFormat, true);
});

test('parseRawTextToBanners - handles emoji format (non-standard)', () => {
    const text = `1️⃣ Emoji question
2️⃣ Another emoji`;

    const result = parseRawTextToBanners(text, mockParsers, mockUtils, mockLogger);
    assert.equal(result.hasStandardFormat, false);
});

test('parseRawTextToBanners - splits prayers from questions within section', () => {
    const text = `❓❓❓ВОПРОСЫ
1. Question text

🙏🙏🙏МОЛИТВЫ
Prayer text here`;

    const result = parseRawTextToBanners(text, mockParsers, mockUtils, mockLogger);
    // The text gets split by section headers
    // Each section can have both questions and prayers parsed via splitPrayerSection
    assert.ok(result.bannersToCreate.length >= 2);
    assert.ok(result.bannersToCreate.some(b => b.category === 'audience'));
    assert.ok(result.bannersToCreate.some(b => b.category === 'prayer'));
});

test('SYH_BANNER_CREATOR - init sets config, utils, parsers', () => {
    const customConfig = { SELECTORS: { test: 'selector' } };
    const customUtils = { test: 'utils' };
    const customParsers = { test: 'parsers' };

    SYH_BANNER_CREATOR.init(customConfig, customUtils, customParsers);

    assert.deepEqual(SYH_BANNER_CREATOR.SELECTORS, customConfig.SELECTORS);
    assert.equal(SYH_BANNER_CREATOR.UTILS, customUtils);
    assert.equal(SYH_BANNER_CREATOR.PARSERS, customParsers);
});

test('SYH_BANNER_CREATOR - init uses defaults when not provided', () => {
    SYH_BANNER_CREATOR.init();

    assert.ok(SYH_BANNER_CREATOR.SELECTORS);
    assert.ok(SYH_BANNER_CREATOR.UTILS);
    assert.ok(SYH_BANNER_CREATOR.PARSERS);
});

test('SYH_BANNER_CREATOR - log outputs to console', () => {
    const originalLog = console.log;
    let logged = '';
    console.log = (msg) => { logged = msg; };

    SYH_BANNER_CREATOR.log('Test message');

    assert.ok(logged.includes('[SYH] Test message'));
    console.log = originalLog;
});

test('executeBannerCreationLoop - processes all banners', async () => {
    const mockCreator = {
        log: mockLogger,
        createSingleBanner: async (text) => { },
        UTILS: { saveBannerCategory: async () => { } },
        finalCleanup: async () => { },
    };

    const banners = [
        { text: 'Question 1', category: 'stream', isStandard: true },
        { text: 'Question 2', category: 'audience', isStandard: true },
    ];

    const count = await executeBannerCreationLoop(mockCreator, banners);
    assert.equal(count, 2);
});

test('executeBannerCreationLoop - handles errors and continues', async () => {
    let attempt = 0;
    const mockCreator = {
        log: mockLogger,
        createSingleBanner: async (text) => {
            attempt++;
            if (attempt === 1) throw new Error('First fails');
        },
        UTILS: { saveBannerCategory: async () => { } },
        finalCleanup: async () => { },
    };

    const banners = [
        { text: 'Question 1', category: 'stream', isStandard: true },
        { text: 'Question 2', category: 'audience', isStandard: true },
    ];

    const count = await executeBannerCreationLoop(mockCreator, banners);
    assert.equal(count, 1);
});

test('SYH_BANNER_CREATOR - clickCancelButton finds cancel button', () => {
    const form = document.createElement('form');
    form.innerHTML = `
        <button type="submit">Submit</button>
        <button type="button" id="banner-timer-dropdown-button">Timer</button>
        <button type="button">Cancel</button>
    `;

    SYH_BANNER_CREATOR.clickCancelButton(form);
});

test('SYH_BANNER_CREATOR - clickCancelButton handles missing cancel button', () => {
    const form = document.createElement('form');
    form.innerHTML = `
        <button type="submit">Submit</button>
    `;

    assert.doesNotThrow(() => SYH_BANNER_CREATOR.clickCancelButton(form));
});

test('SYH_BANNER_CREATOR - executeCustomBanners shows warning and exits for empty list', async () => {
    let warningTitle = '';
    const creator = Object.create(SYH_BANNER_CREATOR);
    creator.UTILS = {
        copyAndShowBanner: (msg, title) => {
            warningTitle = title;
        }
    };

    await creator.executeCustomBanners([]);
    assert.strictEqual(warningTitle, '⚠️ Питання не знайдені');
});

test('SYH_BANNER_CREATOR - executeCustomBanners creates separator when hasStandardFormat is true', async () => {
    const createdSingle = [];
    let filterBannersCalled = false;
    let finishToast = '';

    const creator = Object.create(SYH_BANNER_CREATOR);
    creator.log = () => {};
    creator.ensureCleanStart = async () => {};
    creator.finalCleanup = async () => {};
    creator.createSingleBanner = async (text) => {
        createdSingle.push(text);
    };
    creator.UTILS = {
        saveBannerCategory: async () => {},
        copyAndShowBanner: (msg, title) => {
            finishToast = title;
        }
    };
    creator.UI = {
        filterBanners: () => {
            filterBannersCalled = true;
        }
    };

    const banners = [
        { text: 'Q1', category: 'stream', isStandard: true }
    ];

    await creator.executeCustomBanners(banners, true);

    assert.ok(createdSingle.includes('Q1'), 'Створено Q1');
    assert.ok(createdSingle.includes('----Питання глядачів----'), 'Додано розділювач');
    assert.strictEqual(filterBannersCalled, true, 'Викликано filterBanners');
    assert.strictEqual(finishToast, '🎉 Створення завершено!');
});

test('SYH_BANNER_CREATOR - executeCustomBanners skips separator when hasStandardFormat is false', async () => {
    const createdSingle = [];

    const creator = Object.create(SYH_BANNER_CREATOR);
    creator.log = () => {};
    creator.ensureCleanStart = async () => {};
    creator.finalCleanup = async () => {};
    creator.createSingleBanner = async (text) => {
        createdSingle.push(text);
    };
    creator.UTILS = {
        saveBannerCategory: async () => {},
        copyAndShowBanner: () => {}
    };

    const banners = [
        { text: 'Emoji 1', category: 'prayer', isStandard: false }
    ];

    await creator.executeCustomBanners(banners, false);

    assert.ok(createdSingle.includes('Emoji 1'));
    assert.strictEqual(createdSingle.includes('----Питання глядачів----'), false, 'Розділювач не створюється для не-стандартного формату');
});