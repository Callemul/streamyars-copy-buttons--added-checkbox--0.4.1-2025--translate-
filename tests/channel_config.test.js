import assert from 'node:assert';
import { test, describe } from 'node:test';

const { matchCategory } = await import('../modules/registry/channel_config.ts');

describe('channel_config tests', () => {
    test('1. matchCategory identifies correct category for Oparin video', () => {
        const oparinTitle = "Самое лучшее правление, которого не замечают ?! | Алексей Опарин";
        assert.strictEqual(
            matchCategory(oparinTitle, 'vp'),
            'oparin',
            "Помилка: Має бути 'oparin' для відео з Опаріним"
        );
    });

    test('1b. matchCategory identifies another Oparin video correctly', () => {
        const oparinTitle2 = "Когда и куда эмигрировать? | Алексей Опарин";
        assert.strictEqual(
            matchCategory(oparinTitle2, 'vp'),
            'oparin',
            "Помилка: Має бути 'oparin' для відео з Опаріним"
        );
    });

    test('2. matchCategory identifies correct category for Sabbath School on vp', () => {
        const ssTitle = "13 июля. Итоги. Урок субботней школы. Марк 1";
        assert.strictEqual(
            matchCategory(ssTitle, 'vp'),
            'vp_ss',
            "Помилка: Має бути 'vp_ss' для Суботньої школи"
        );
    });

    test('2b. matchCategory identifies Sabbath School when both Oparin and SS are present', () => {
        const title = "СУББОТНЯЯ ШКОЛА | УРОК 4 Грех в церкви| Молчанов, Опарин, Василенко";
        assert.strictEqual(
            matchCategory(title, 'vp'),
            'vp_ss',
            "Помилка: Має бути 'vp_ss', оскільки це Суботня школа (хоча там є Опарін)"
        );
    });

    test('3. matchCategory returns null for unknown video on vp', () => {
        const unknownTitle = "Просто трансляция без ключевых слов";
        assert.strictEqual(
            matchCategory(unknownTitle, 'vp'),
            null,
            "Помилка: Має бути null для відео без ключових слів на каналі vp"
        );
    });

    test('4. matchCategory identifies correct category for Sabbath School on slovo', () => {
        const ssTitle = "Урок субботней школы. Слово Живое.";
        assert.strictEqual(
            matchCategory(ssTitle, 'slovo'),
            'molchanov_ss',
            "Помилка: Має бути 'molchanov_ss' для СШ на Слово Живое"
        );
    });

    test('5. matchCategory falls back correctly for slovo channel', () => {
        const preachTitle = "Проповедь Артем Молчанов";
        assert.strictEqual(
            matchCategory(preachTitle, 'slovo'),
            'molchanov_preach',
            "Помилка: Має бути 'molchanov_preach' як дефолт для проповідей Молчанова"
        );
    });

    test('6. matchCategory correctly identifies user reported video title as Oparin', () => {
        const title = "Что значит служить Богу не от полного сердца?  | Алексей Опарин";
        assert.strictEqual(
            matchCategory(title, 'vp'),
            'oparin',
            "Помилка: Має бути 'oparin' для відео Опаріна з питанням про серце"
        );
    });

    test('7. matchCategory handles Ukrainian spelling for Oparin', () => {
        const title = "Проповідь Опарін О.О.";
        assert.strictEqual(
            matchCategory(title, 'vp'),
            'oparin',
            "Помилка: Має бути 'oparin' для україномовного написання Опарін"
        );
    });

    test('8. matchCategory does NOT falsely match words containing сш substring (like масштаб)', () => {
        const title = "Масштабные события церкви";
        assert.strictEqual(
            matchCategory(title, 'vp'),
            null,
            "Помилка: Не повинно мапитися на vp_ss через підрядок сш у слові масштабні"
        );
    });
});
