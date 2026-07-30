import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Popup DOM Smoke Test: popup.html contains all critical IDs', () => {
    const htmlPath = path.resolve(process.cwd(), 'popup/popup.html');
    assert.ok(fs.existsSync(htmlPath), 'popup.html exists');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const requiredIds = [
        'step3Columns',
        'step3Left',
        'step3Divider',
        'step3Right',
        'clearYTCollected',
        'ytCollectedList',
        'tgTotalCountAll',
        'tgTotalCountLeft',
        'tgTotalCountRight',
        'newTelegram',
        'countOld',
        'countDel',
        'countNewLeft',
        'countNewYT',
        'countTotal'
    ];

    for (const id of requiredIds) {
        assert.ok(
            htmlContent.includes(`id="${id}"`),
            `popup.html missing required element ID: #${id}`
        );
    }
});

test('Popup Init Script Test: Root-level event listeners are properly scoped inside document.ready', () => {
    const initPath = path.resolve(process.cwd(), 'popup/popup_init.js');
    assert.ok(fs.existsSync(initPath), 'popup_init.js exists');
    const initContent = fs.readFileSync(initPath, 'utf8');

    // Check that event listeners like $('#clearYTCollected').click or $(...).on are inside functions or document.ready
    const lines = initContent.split('\n');
    let scopeDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('//')) continue;

        // Track block depth
        for (let char of line) {
            if (char === '{' || char === '(') scopeDepth++;
            if (char === '}' || char === ')') scopeDepth--;
        }

        // Check if root level contains direct event bindings outside functions
        if (scopeDepth === 0) {
            const isDirectBinding = /^\$\(['"][^'"]+['"]\)\.(click|on|change|submit|bind)\(/.test(line);
            assert.ok(
                !isDirectBinding,
                `Direct jQuery event binding outside ready()/function scope at popup_init.js line ${i + 1}: "${line}"`
            );
        }
    }
});
