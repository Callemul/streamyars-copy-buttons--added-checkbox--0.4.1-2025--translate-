import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
    SyhBannerModal,
    openBannerCreationModal,
} from '../modules/banner_modal.ts';
import { parseTextToSections } from '../modules/banner_modal_parser.ts';
import { SESSION_DRAFT_KEY } from '../modules/banner_modal_draft.ts';

function createMockParsers() {
    return {
        parseStandardNumberedQuestions: (text) => {
            return text.split('\n')
                .map(l => l.trim())
                .filter(l => /^\d+[.)]/.test(l))
                .map(l => l.replace(/^\d+[.)]\s*/, '').trim());
        },
        parseEmojiNumberedQuestions: (text) => {
            return text.split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0 && !/^\d+\uFE0F?\u20E3/.test(l) && !/^@/.test(l));
        },
        parseSabbathSchoolUnnumberedQuestions: (text) => {
            return text.split('\n').map(l => l.trim()).filter(Boolean);
        }
    };
}

function createMockUtils() {
    return {
        cleanTelegramHeaders: (t) => t
    };
}

function createMockCreator() {
    return {
        PARSERS: createMockParsers(),
        UTILS: createMockUtils(),
        executeCustomBanners: mock.fn(async () => {}),
        processAndCreateBanners: mock.fn(async () => {})
    };
}

describe('banner_modal — parseTextToSections', () => {
    test('1. Порожній вхід повертає порожній результат', () => {
        const result = parseTextToSections('', createMockParsers(), createMockUtils());
        assert.strictEqual(result.sections.length, 0);
        assert.strictEqual(result.allBanners.length, 0);
        assert.strictEqual(result.hasStandardFormat, false);
    });

    test('2. Розбиття на 2 секції (питання + молитви)', () => {
        const input = `❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Питання перше\n\n🙏🙏🙏 МОЛИТВЫ\n1. Молитва перша`;
        const result = parseTextToSections(input, createMockParsers(), createMockUtils());

        assert.strictEqual(result.sections.length, 2);
        assert.strictEqual(result.sections[0].category, 'audience');
        assert.strictEqual(result.sections[1].category, 'prayer');
        assert.strictEqual(result.allBanners.length, 2);
    });

    test('3. Ручне перевизначення категорії секції (categoryOverrides)', () => {
        const input = `❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Питання перше`;
        // За замовчуванням категорія audience, але ми примусово задаємо stream для секції 1
        const result = parseTextToSections(input, createMockParsers(), createMockUtils(), { 1: 'stream' });

        assert.strictEqual(result.sections[0].category, 'stream');
        assert.strictEqual(result.sections[0].banners[0].category, 'stream');
        assert.strictEqual(result.allBanners[0].category, 'stream');
    });

    test('4. Формуються діагностичні логи', () => {
        const input = `1. Перше питання`;
        const result = parseTextToSections(input, createMockParsers(), createMockUtils());

        assert.ok(result.logs.length > 0);
        assert.ok(result.logs.some(l => l.includes('Виявлено логічних блоків')));
    });
});

describe('banner_modal — SyhBannerModal DOM Lifecycle', () => {
    let mockCreator;

    beforeEach(() => {
        mockCreator = createMockCreator();
        // Clear any leftover modals in happy-dom document body
        document.body.innerHTML = '';
        try {
            sessionStorage.clear();
        } catch {
            // ignore
        }
    });

    afterEach(() => {
        document.body.innerHTML = '';
        try {
            sessionStorage.clear();
        } catch {
            // ignore
        }
    });

    test('5. open() монтує модальне вікно в document.body', () => {
        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        const overlay = document.querySelector('.syh-banner-modal-overlay');
        assert.ok(overlay, 'Overlay змонтовано в DOM');

        const title = overlay.querySelector('.syh-banner-modal-title');
        assert.ok(title?.textContent?.includes('Створення банерів'));

        modal.close();
        assert.strictEqual(document.querySelector('.syh-banner-modal-overlay'), null);
    });

    test('6. Закриття по Escape', () => {
        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        assert.ok(document.querySelector('.syh-banner-modal-overlay'));

        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(escEvent);

        assert.strictEqual(document.querySelector('.syh-banner-modal-overlay'), null);
    });

    test('7. Закриття по кліку на хрестик та Скасувати', () => {
        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        const closeBtn = document.querySelector('.syh-banner-modal-close');
        closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        assert.strictEqual(document.querySelector('.syh-banner-modal-overlay'), null);

        // Відкриваємо знову і закриваємо через Скасувати
        modal.open();
        const cancelBtn = document.querySelector('.syh-btn-cancel');
        cancelBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        assert.strictEqual(document.querySelector('.syh-banner-modal-overlay'), null);
    });

    test('8. Вставка тексту оновлює Live Preview та лічильник банерів', async () => {
        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        const textarea = document.querySelector('.syh-modal-textarea');
        textarea.value = `1. Перше питання\n2. Друге питання`;

        modal.triggerParse();

        const countBadge = document.querySelector('.syh-preview-badge-count');
        assert.strictEqual(countBadge?.textContent, '2');

        const submitBtn = document.querySelector('.syh-btn-submit');
        assert.strictEqual(submitBtn?.textContent, '🚀 Створити банери (2)');
        assert.strictEqual(submitBtn?.disabled, false);

        const cards = document.querySelectorAll('.syh-preview-card');
        assert.strictEqual(cards.length, 2);

        modal.close();
    });

    test('9. Клік по кнопці категорії блоку перемикає категорію всіх питань секції', () => {
        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        const textarea = document.querySelector('.syh-modal-textarea');
        textarea.value = `❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Питання 1`;
        modal.triggerParse();

        let card = document.querySelector('.syh-preview-card');
        assert.strictEqual(card?.getAttribute('data-cat'), 'audience');

        // Натискаємо кнопку "🟣 Ефір" у шапці секції
        const streamBtn = document.querySelector('.syh-section-cat-btn');
        assert.ok(streamBtn?.textContent?.includes('Ефір'));
        streamBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        card = document.querySelector('.syh-preview-card');
        assert.strictEqual(card?.getAttribute('data-cat'), 'stream');

        modal.close();
    });

    test('10. Кнопка "Очистити все" скидає textarea, sessionStorage та прев\'ю', () => {
        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        const textarea = document.querySelector('.syh-modal-textarea');
        textarea.value = `1. Питання`;
        modal.triggerParse();

        assert.strictEqual(document.querySelectorAll('.syh-preview-card').length, 1);

        const clearBtn = document.querySelector('.syh-modal-btn-clear');
        clearBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        assert.strictEqual(textarea.value, '');
        assert.strictEqual(document.querySelectorAll('.syh-preview-card').length, 0);
        assert.strictEqual(sessionStorage.getItem(SESSION_DRAFT_KEY), null);

        modal.close();
    });

    test('11. Натискання кнопки "Створити банери" закриває модалку і викликає executeCustomBanners', () => {
        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        const textarea = document.querySelector('.syh-modal-textarea');
        textarea.value = `1. Питання одне`;
        modal.triggerParse();

        const submitBtn = document.querySelector('.syh-btn-submit');
        submitBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // Модалка закривається
        assert.strictEqual(document.querySelector('.syh-banner-modal-overlay'), null);

        // Перевіряємо виклик executeCustomBanners
        assert.strictEqual(mockCreator.executeCustomBanners.mock.callCount(), 1);
        const args = mockCreator.executeCustomBanners.mock.calls[0].arguments;
        assert.strictEqual(args[0].length, 1);
        assert.strictEqual(args[0][0].text, 'Питання одне');
    });

    test('12. Відновлення чернетки з sessionStorage при відкритті', () => {
        sessionStorage.setItem(SESSION_DRAFT_KEY, 'Збережений текст чернетки');

        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        const textarea = document.querySelector('.syh-modal-textarea');
        assert.strictEqual(textarea?.value, 'Збережений текст чернетки');

        modal.close();
    });

    test('13. openBannerCreationModal функція створює і відкриває модалку', () => {
        const modal = openBannerCreationModal(mockCreator);
        assert.ok(modal instanceof SyhBannerModal);
        assert.ok(document.querySelector('.syh-banner-modal-overlay'));

        modal.close();
    });

    test('14. Клік по шаблону-чіпсу додає шаблон на позицію курсора', () => {
        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        const textarea = document.querySelector('.syh-modal-textarea');
        const chip = document.querySelector('.syh-template-chip');
        assert.ok(chip);

        chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        assert.ok(textarea.value.includes('ВОПРОСЫ'));

        modal.close();
    });

    test('15. handleSubmit використовує fallback на processAndCreateBanners коли executeCustomBanners відсутній', () => {
        const fallbackCreator = {
            PARSERS: createMockParsers(),
            UTILS: createMockUtils(),
            processAndCreateBanners: mock.fn(async () => {})
        };

        const modal = new SyhBannerModal(fallbackCreator);
        modal.open();

        const textarea = document.querySelector('.syh-modal-textarea');
        textarea.value = `1. Фолбек-питання`;
        modal.triggerParse();

        const submitBtn = document.querySelector('.syh-btn-submit');
        submitBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        assert.strictEqual(fallbackCreator.processAndCreateBanners.mock.callCount(), 1);
        modal.close();
    });

    test('16. handleSubmit є no-op якщо allBanners порожній', () => {
        const modal = new SyhBannerModal(mockCreator);
        modal.open();

        // Викликаємо handleSubmit при порожньому списку банерів
        modal['handleSubmit']();

        assert.strictEqual(mockCreator.executeCustomBanners.mock.callCount(), 0);
        assert.ok(document.querySelector('.syh-banner-modal-overlay'), 'Модалка лишається відкритою');

        modal.close();
    });

    test('17. handleCreateBannersAction коректно викликає openBannerCreationModal або ігнорує null', async () => {
        const { handleCreateBannersAction } = await import('../modules/streamyard/banners/category.ts');

        // null перевірка - не падає
        assert.doesNotThrow(() => handleCreateBannersAction(null));
        assert.doesNotThrow(() => handleCreateBannersAction(undefined));

        // з валідним творцем - відкриває модалку
        handleCreateBannersAction(mockCreator);
        assert.ok(document.querySelector('.syh-banner-modal-overlay'));

        const closeBtn = document.querySelector('.syh-banner-modal-close');
        closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
});
