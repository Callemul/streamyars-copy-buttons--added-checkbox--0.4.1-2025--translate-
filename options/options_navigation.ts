// options/options_navigation.ts
//
// Ліве меню сторінки налаштувань: перемикання `.nav-item` ↔ `.content-section`.
//
// Виділено з `OptionsController.initNavigation` — це самодостатня робота з DOM,
// не пов'язана ні зі storage, ні з формою налаштувань.
//
// Поведінка 1-в-1, включно з квірком: пункт меню без `data-target` (або з
// посиланням на неіснуючу секцію) все одно отримує клас `active`, хоча жодна
// секція при цьому не активується.

const NAV_ITEM_SELECTOR = '.nav-item';
const SECTION_SELECTOR = '.content-section';
const ACTIVE_CLASS = 'active';

function activateSection(targetId: string | null): void {
    if (!targetId) return;
    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.add(ACTIVE_CLASS);
}

export function initSectionNavigation(): void {
    const navItems = document.querySelectorAll<HTMLButtonElement>(NAV_ITEM_SELECTOR);
    const sections = document.querySelectorAll<HTMLElement>(SECTION_SELECTOR);

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove(ACTIVE_CLASS));
            sections.forEach(s => s.classList.remove(ACTIVE_CLASS));

            item.classList.add(ACTIVE_CLASS);
            activateSection(item.getAttribute('data-target'));
        });
    });
}
