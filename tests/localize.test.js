import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localize } from '../modules/dom/localize.ts';
import { SYH_I18N } from '../modules/registry/i18n.ts';

test('localizes text and attributes without interpreting translation as HTML', () => {
    const original = SYH_I18N.getMessage;
    const translations = { label: '<b>Save</b>', hint: 'Enter a name', help: 'Save changes' };
    SYH_I18N.getMessage = (key, fallback) => translations[key] ?? fallback;
    try {
        const root = document.createElement('section');
        root.innerHTML = '<span data-i18n="label">Зберегти</span><input data-i18n-placeholder="hint" placeholder="Ім’я"><button data-i18n-title="help" title="Зберегти" data-i18n-aria-label="help"></button>';
        localize(root);
        assert.equal(root.querySelector('span').textContent, '<b>Save</b>');
        assert.equal(root.querySelector('b'), null);
        assert.equal(root.querySelector('input').placeholder, 'Enter a name');
        assert.equal(root.querySelector('button').getAttribute('aria-label'), 'Save changes');
        assert.equal(root.querySelector('button').title, 'Save changes');
    } finally {
        SYH_I18N.getMessage = original;
    }
});

test('keeps untranslated fallback and nested controls; handles marked root', () => {
    const original = SYH_I18N.getMessage;
    SYH_I18N.getMessage = (key, fallback) => key === 'known' ? 'Translated' : fallback;
    try {
        const root = document.createElement('button');
        root.dataset.i18n = 'known';
        root.innerHTML = '<svg></svg><span data-i18n="missing">Fallback</span>';
        localize(root);
        assert.ok(root.querySelector('svg'));
        assert.equal(root.querySelector('span').textContent, 'Fallback');
        const label = document.createElement('span');
        label.dataset.i18n = 'known';
        localize(label);
        assert.equal(label.textContent, 'Translated');
    } finally {
        SYH_I18N.getMessage = original;
    }
});
