import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CSS_FILES = [
    'styles.css',
    'popup/popup.css',
    'options/options.css',
    'youtube/youtube_styles.css'
];

function checkCssFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');

    let openBraces = 0;
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cleanLine = line.replace(/\/\*[\s\S]*?\*\//g, '').trim();
        if (!cleanLine) continue;

        for (let char of cleanLine) {
            if (char === '{') openBraces++;
            if (char === '}') openBraces--;
        }

        assert.ok(openBraces >= 0, `Unmatched closing brace '}' in ${filePath} at line ${i + 1}`);

        if (openBraces === 0) {
            if (cleanLine.includes(':') && !cleanLine.startsWith('@') && !cleanLine.startsWith('/*') && !cleanLine.includes('{')) {
                const isDeclaration = /^[a-zA-Z0-9-]+\s*:\s*[^;]+;?$/.test(cleanLine);
                assert.ok(
                    !isDeclaration,
                    `Orphan CSS property declaration outside selector block in ${filePath} at line ${i + 1}: "${cleanLine}"`
                );
            }
        }
    }

    assert.equal(openBraces, 0, `Unclosed open brace '{' in ${filePath}`);
}

test('CSS Linter: All CSS files have valid syntax and no orphan property declarations', () => {
    for (const file of CSS_FILES) {
        checkCssFile(path.resolve(process.cwd(), file));
    }
});
