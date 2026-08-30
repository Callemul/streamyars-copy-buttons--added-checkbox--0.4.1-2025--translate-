// tests/yt_comment_identity.test.js
//
// Тести Comment Identity v2 та зворотної сумісності/міграції (Задача YT-E1).

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installChromeMock } from './setup/chrome_mock.ts';
import {
    extractCommentId,
    extractLegacyCommentId,
    generateLegacyCommentId,
    hashString
} from '../youtube/yt_comment_identity.ts';
import { YouTubeCommentAdapter } from '../youtube/yt_adapter.ts';

installChromeMock();

function createCommentElement({
    linkHref = '',
    nodeId = '',
    dataCid = '',
    author = 'TestAuthor',
    text = 'Test text content'
} = {}) {
    const el = document.createElement('div');
    if (nodeId) el.id = nodeId;
    if (dataCid) el.setAttribute('data-cid', dataCid);

    if (linkHref) {
        const a = document.createElement('a');
        a.href = linkHref;
        el.appendChild(a);
    }

    const authorEl = document.createElement('div');
    authorEl.id = 'author-text';
    authorEl.textContent = author;
    el.appendChild(authorEl);

    const textEl = document.createElement('div');
    textEl.id = 'content-text';
    textEl.textContent = text;
    el.appendChild(textEl);

    return el;
}

describe('Comment Identity v2 & Migration (YT-E1)', () => {
    test('1. Останній fallback v2 не колідує при однакових перших 20 символах', () => {
        const textA = 'Помоліться за мене, будь ласка! Перший варіант тексту';
        const textB = 'Помоліться за мене, будь ласка! Другий варіант тексту';

        assert.equal(textA.slice(0, 20), textB.slice(0, 20), 'Перші 20 символів мають збігатися для тесту');

        const elA = createCommentElement({ author: 'Maria', text: textA });
        const elB = createCommentElement({ author: 'Maria', text: textB });

        // У legacy v1 вони дають однаковий хеш:
        const legacyA = extractLegacyCommentId(elA);
        const legacyB = extractLegacyCommentId(elB);
        assert.equal(legacyA, legacyB, 'Legacy v1 дає колізію на перших 20 символах');

        // У v2 вони дають РІЗНІ ідентифікатори:
        const idA = extractCommentId(elA);
        const idB = extractCommentId(elB);
        assert.ok(idA.startsWith('yt_v2_'));
        assert.ok(idB.startsWith('yt_v2_'));
        assert.notEqual(idA, idB, 'Identity v2 усуває колізію на довгих текстах');
    });

    test('2. Останній fallback v2 не колідує для однакового коментаря під різними відео', () => {
        const author = 'JohnDoe';
        const text = 'Амінь і слава Богу!';

        const el = createCommentElement({ author, text });

        const idVideo1 = extractCommentId(el, 'video_abc_123');
        const idVideo2 = extractCommentId(el, 'video_xyz_789');

        assert.ok(idVideo1.startsWith('yt_v2_'));
        assert.ok(idVideo2.startsWith('yt_v2_'));
        assert.notEqual(idVideo1, idVideo2, 'Різні videoId не повинні давати однаковий ID');
    });

    test('3. Пріоритет permalink > nodeId > data-cid > v2 fallback', () => {
        // permalink перемагає все
        const withPermalink = createCommentElement({
            linkHref: 'https://www.youtube.com/watch?v=123&lc=PERMALINK_CID_999',
            nodeId: 'node_1',
            dataCid: 'cid_1'
        });
        assert.equal(extractCommentId(withPermalink), 'PERMALINK_CID_999');

        // nodeId перемагає data-cid
        const withNodeId = createCommentElement({
            nodeId: 'node_1',
            dataCid: 'cid_1'
        });
        assert.equal(extractCommentId(withNodeId), 'node_1');

        // data-cid перемагає v2 fallback
        const withDataCid = createCommentElement({
            dataCid: 'cid_1'
        });
        assert.equal(extractCommentId(withDataCid), 'cid_1');
    });

    test('4. Відновлення legacy стану та ідемпотентна міграція без втрати даних (Zero Data Loss)', () => {
        const adapter = new YouTubeCommentAdapter();
        const author = 'Олена';
        const text = 'Прошу молитися за одужання брата';
        const el = createCommentElement({ author, text });

        const v2Id = extractCommentId(el, 'vid_vp_1');
        const legacyKey = generateLegacyCommentId(author, text);

        assert.ok(v2Id.startsWith('yt_v2_'));
        assert.ok(legacyKey.startsWith('yt_'));
        assert.notEqual(v2Id, legacyKey);

        const context = {
            id: v2Id,
            author,
            text,
            videoId: 'vid_vp_1'
        };

        const caches = {
            buttonStates: {
                [legacyKey]: 'prayer'
            },
            checkboxStates: {
                [legacyKey]: { checked: true, timestamp: 123456789 }
            }
        };

        // Читання buttonState: повертає legacy стан і мігрує у v2
        const state = adapter.getButtonState(context, v2Id, caches);
        assert.equal(state, 'prayer', 'Повинен відновити стан зі старого ключа');
        assert.equal(caches.buttonStates[v2Id], 'prayer', 'Повинен скопіювати стан у v2 ключ');
        assert.equal(caches.buttonStates[legacyKey], 'prayer', 'Старий ключ НЕ повинен видалятися (rollback safe)');

        // Читання checkboxState: повертає legacy галочку і мігрує у v2
        const isChecked = adapter.getCheckboxState(context, v2Id, caches);
        assert.equal(isChecked, true, 'Повинен відновити checked зі старого ключа');
        assert.equal(caches.checkboxStates[v2Id]?.checked, true, 'Повинен скопіювати у v2');
        assert.equal(caches.checkboxStates[legacyKey]?.checked, true, 'Старий ключ збережено для безпеки');

        // Ідемпотентність: повторний виклик не змінює стан
        const stateAgain = adapter.getButtonState(context, v2Id, caches);
        assert.equal(stateAgain, 'prayer');
    });
});
