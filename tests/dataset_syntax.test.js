/**
 * tests/dataset_syntax.test.js
 *
 * Статичний аналіз вихідного коду (linter-рівень).
 *
 * Мета: виявляти небезпечний патерн  dataset['key-with-hyphens']
 * у будь-якому .ts / .js файлі проєкту (крім node_modules та dist).
 *
 * Чому це важливо:
 *   Специфікація WHATWG DOM (§ 8.1.2.4 "DOMStringMap") забороняє звернення
 *   до dataset через bracket-notation з ключем, що містить дефіси.
 *   Такий запис кидає SyntaxError у jsdom (і Chrome).
 *   Правильна альтернатива: element.getAttribute('data-my-key').
 *
 * Тест сканує src-файли рекурсивно і повідомляє точний файл + номер рядка.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Небезпечний патерн: .dataset[ потім відкрита лапка, потім ключ з дефісом
// Приклади що відловлює:
//   element.dataset['syh-studio-events-bound']
//   (el as HTMLElement).dataset["some-key"]
//   ui.badgeEl.dataset['syh-bound']
// ---------------------------------------------------------------------------
const DANGEROUS_PATTERN = /\.dataset\s*\[\s*['"][^'"]*-[^'"]*['"]/;

// ---------------------------------------------------------------------------
// Директорії та файли, які пропускаємо
// ---------------------------------------------------------------------------
const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    '.git',
    '.idea',
    '.kilo',
]);

// Конкретні файли, в яких дозволено мати патерн (тест-guards тощо)
const SKIP_FILES = new Set([
    'dataset_attr.test.js', // містить intentional SyntaxError guard-тест
    'dataset_syntax.test.js', // сам цей файл
]);

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Рекурсивний збір .ts / .js файлів
// ---------------------------------------------------------------------------
function collectSourceFiles(dir, results = []) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            collectSourceFiles(fullPath, results);
        } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
            if (!SKIP_FILES.has(entry.name)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

// ---------------------------------------------------------------------------
// Тест
// ---------------------------------------------------------------------------
test('Static Analysis: dataset bracket-notation з дефісами у ключі відсутня у всьому проєкті', () => {
    const files = collectSourceFiles(ROOT);
    assert.ok(files.length > 0, 'Повинні знайтись хоча б кілька .ts/.js файлів для аналізу');

    const violations = [];

    for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Пропускаємо коментарі (однорядкові)
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

            if (DANGEROUS_PATTERN.test(line)) {
                const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
                violations.push({
                    file: relativePath,
                    line: i + 1,
                    content: trimmed
                });
            }
        }
    }

    if (violations.length > 0) {
        const report = violations.map(v =>
            `  ${v.file}:${v.line}\n    → ${v.content}`
        ).join('\n\n');

        assert.fail(
            `Знайдено ${violations.length} небезпечних dataset[\'key-with-hyphens\'] виразів!\n\n` +
            `Це порушення специфікації WHATWG DOM (SyntaxError у jsdom/Chrome).\n` +
            `Замість цього використовуй getAttribute / setAttribute / hasAttribute.\n\n` +
            `Знайдені порушення:\n${report}`
        );
    }

    // Якщо всі добре — виводимо статистику
    console.log(`[dataset_syntax] Перевірено ${files.length} файлів — порушень не знайдено ✓`);
});

// ---------------------------------------------------------------------------
// Додатковий тест: патерн дійсно відловлює небезпечний рядок (guard test)
// ---------------------------------------------------------------------------
test('Static Analysis: RegExp-патерн коректно виявляє небезпечні вирази', () => {
    const dangerous = [
        `element.dataset['syh-studio-events-bound'] = 'true'`,
        `(el as HTMLElement).dataset["syh-bound"] = 'true'`,
        `return node.dataset['some-data-key'] === 'true'`,
        `ui.badgeEl.dataset['my-flag'] !== 'true'`,
    ];

    const safe = [
        `element.getAttribute('data-syh-studio-events-bound')`,
        `element.setAttribute('data-syh-bound', 'true')`,
        `element.dataset.syhBound = 'true'`,          // camelCase — OK
        `element.dataset['nohyphens'] = 'true'`,       // без дефісів — OK
    ];

    for (const line of dangerous) {
        assert.ok(
            DANGEROUS_PATTERN.test(line),
            `Патерн ПОВИНЕН відловити: ${line}`
        );
    }

    for (const line of safe) {
        assert.ok(
            !DANGEROUS_PATTERN.test(line),
            `Патерн НЕ повинен спрацювати на: ${line}`
        );
    }
});
