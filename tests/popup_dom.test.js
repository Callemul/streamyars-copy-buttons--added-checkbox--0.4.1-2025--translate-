import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Popup DOM Smoke Test: popup.html contains all critical IDs for 4 sheets', () => {
    const htmlPath = path.resolve(process.cwd(), 'popup/popup.html');
    assert.ok(fs.existsSync(htmlPath), 'popup.html exists');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const baseRequiredIds = [
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
        'countTotal',
        'deletedLogCount',
        'cleanedLogCount'
    ];

    const sheets = ['vp_ss', 'oparin', 'molchanov_ss', 'molchanov_preach'];

    for (const sheetId of sheets) {
        for (const baseId of baseRequiredIds) {
            const suffixedId = `${baseId}__${sheetId}`;
            assert.ok(
                htmlContent.includes(`id="${suffixedId}"`),
                `popup.html missing required element ID: #${suffixedId}`
            );
        }
    }
});

test('Popup Init Script Test: Root-level event listeners are properly scoped inside document.ready', () => {
    let initPath = path.resolve(process.cwd(), 'popup/popup_init.ts');
    if (!fs.existsSync(initPath)) initPath = path.resolve(process.cwd(), 'popup/popup_init.js');
    assert.ok(fs.existsSync(initPath), 'popup_init script exists');
    const initContent = fs.readFileSync(initPath, 'utf8');

    const lines = initContent.split('\n');
    let scopeDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('//')) continue;

        for (let char of line) {
            if (char === '{' || char === '(') scopeDepth++;
            if (char === '}' || char === ')') scopeDepth--;
        }

        if (scopeDepth === 0) {
            const isDirectBinding = /^\$\(['"][^'"]+['"]\)\.(click|on|change|submit|bind)\(/.test(line);
            assert.ok(
                !isDirectBinding,
                `Direct jQuery event binding outside ready()/function scope at popup_init.js line ${i + 1}: "${line}"`
            );
        }
    }
});
