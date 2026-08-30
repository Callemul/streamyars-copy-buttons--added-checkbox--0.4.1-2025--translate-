// youtube/studio/studio_selector_queries.ts
//
// ПРИЗНАЧЕННЯ: низькорівневі примітиви DOM-запитів для селекторів Studio.
//
// Реалізує послідовний fallback (YT-D3): перший селектор у масиві має справжній пріоритет.
// Запобігає ситуаціям, коли менш специфічний або батьківський вузол перехоплює результат
// через порядок у DOM-дереві при використанні групування через кому.

import { type SelectorValue } from '../../modules/config';
import { PARENT_THREAD_SELECTOR } from './studio_selector_constants';

/** Корінь пошуку: документ або будь-який елемент-контейнер. */
export type StudioQueryRoot = Document | HTMLElement;

/**
 * `querySelector` за `SelectorValue`.
 * Якщо передано масив селекторів, перебирає їх по черзі за пріоритетом (Sequential Fallback).
 */
export function queryOne<T extends HTMLElement = HTMLElement>(
    root: StudioQueryRoot,
    selectorValue: SelectorValue
): T | null {
    if (Array.isArray(selectorValue)) {
        for (const selector of selectorValue) {
            const el = root.querySelector<T>(selector);
            if (el) return el;
        }
        return null;
    }
    return root.querySelector<T>(selectorValue);
}

/**
 * `querySelectorAll` за `SelectorValue`.
 * Зберігає порядок пріоритетів селекторів та усуває дублікати.
 */
export function queryAll<T extends HTMLElement = HTMLElement>(
    root: StudioQueryRoot,
    selectorValue: SelectorValue
): T[] {
    if (Array.isArray(selectorValue)) {
        const seen = new Set<T>();
        const results: T[] = [];
        for (const selector of selectorValue) {
            const elements = root.querySelectorAll<T>(selector);
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                if (!seen.has(el)) {
                    seen.add(el);
                    results.push(el);
                }
            }
        }
        return results;
    }
    return Array.from(root.querySelectorAll<T>(selectorValue));
}

/** Обрізаний `textContent` першого збігу або порожній рядок. */
export function readTrimmedText(root: StudioQueryRoot, selectorValue: SelectorValue): string {
    const el = queryOne(root, selectorValue);
    return el ? (el.textContent || '').trim() : '';
}

/**
 * REPLY INHERITANCE: читає значення в межах самого коментаря, а якщо результат
 * порожній (`''` / `null`) — перечитує його з батьківського треду.
 */
export function readWithThreadFallback<V>(
    thread: HTMLElement,
    read: (root: HTMLElement) => V
): V {
    const direct = read(thread);
    if (direct) return direct;
    if (typeof thread.closest !== 'function') return direct;

    const parentThread = thread.closest<HTMLElement>(PARENT_THREAD_SELECTOR);
    return parentThread ? read(parentThread) : direct;
}
