// tests/version_consistency.test.js
//
// Версія розширення живе в кількох файлах, і частина з них — не про реліз.
// Цей тест фіксує, ЩО має збігатися, а що навмисно НІ, щоб наступного релізу
// ніхто не «полагодив» зайвого і не забув потрібного.
//
// Збігатися мусять:
//   • `manifest.json` ↔ `package.json` — це одна й та сама версія збірки;
//   • плейсхолдер у `options/options.html` — його видно частку секунди до
//     того, як `initVersionBadge()` перепише бейдж значенням з маніфесту.
//     Розбіжність не ламає нічого, але показує користувачу стару версію.
//
// НЕ мусять збігатися:
//   • `DEFAULT_VERSION` (`modules/bootstrap_app.ts`) і `FALLBACK_VERSION`
//     (`options/options_config_io.ts`) — це фолбеки для середовищ без
//     `chrome.runtime` (тести, прямий запуск модуля). Вони навмисно не
//     зв'язані з релізною версією, і один із них прямо зафіксований тестом
//     `options_controller_io` («без збереженої версії підставляється 1.0.0»).

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

describe('версія розширення — що має збігатися', () => {
    test('manifest.json і package.json описують ту саму версію', () => {
        assert.equal(manifest.version, pkg.version);
    });

    test('версія має вигляд X.Y.Z', () => {
        assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
    });

    test('плейсхолдер бейджа в options.html не відстає від маніфесту', () => {
        const html = readFileSync('options/options.html', 'utf8');
        const badge = html.match(/id="optionsVersionBadge"[^>]*>([^<]*)</);

        assert.ok(badge, 'у options.html має бути бейдж #optionsVersionBadge');
        assert.ok(
            badge[1].includes(`v${manifest.version}`),
            `бейдж показує «${badge[1].trim()}», а версія збірки — ${manifest.version}. ` +
            'Це видно користувачу до відпрацювання JS: підніміть плейсхолдер разом із маніфестом.'
        );
    });
});

describe('версія розширення — що навмисно НЕ збігається', () => {
    // Якщо ці фолбеки почнуть «доганяти» релізну версію, зміниться вміст
    // файла експорту конфігурації в середовищах без chrome.runtime.
    test('фолбеки для середовищ без chrome.runtime лишаються незалежними', () => {
        const bootstrap = readFileSync('modules/bootstrap_app.ts', 'utf8');
        const configIo = readFileSync('options/options_config_io.ts', 'utf8');

        assert.match(bootstrap, /DEFAULT_VERSION\s*=\s*'\d+\.\d+\.\d+'/);
        assert.match(configIo, /FALLBACK_VERSION\s*=\s*'\d+\.\d+\.\d+'/);
    });
});
