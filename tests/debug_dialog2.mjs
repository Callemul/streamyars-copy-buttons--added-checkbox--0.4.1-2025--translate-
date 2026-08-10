import { installChromeMock } from './setup/chrome_mock.ts';
installChromeMock({ runtimeImpl: { id: 't' } });

const { bindContextMenuHandlers } = await import('../modules/event_comments/handlers/context_menu.ts');

document.body.innerHTML = `
<div class="test-comment-block">
    <div class="test-comment-text">Test prayer</div>
    <button data-testid="show-comment-button">Actions</button>
    <input class="syh-checkbox" data-type="comment" type="checkbox" checked>
</div>
`;

const calls = { updateCommentVisuals: [], filterStarredComments: 0 };
const ui = {
    updateCommentVisuals: (block, type) => calls.updateCommentVisuals.push({ block, type }),
    filterStarredComments: () => { calls.filterStarredComments++; },
    prayersCache: [],
};

const self = {
    SELECTORS: { commentBlock: '.test-comment-block', commentText: '.test-comment-text', commentAuthor: '.x', starButton: '.y' },
    STATE: {},
    UTILS: {},
    UI: ui,
    TIMINGS: {},
    isBound: false,
    _contextHandler: undefined,
    _copyPrayerContextHandler: undefined,
    _clickHandler: undefined,
    _middleClickHandler: undefined,
    _syhButtonMouseDownHandler: undefined,
    _mouseupHandler: undefined,
    _changeHandler: undefined,
    removeFromDatabase: () => Promise.resolve(),
    saveToDatabase: () => Promise.resolve(),
    init: () => {},
    bindEvents: () => {},
    destroy: () => {},
    bindAutoHealScanner: () => {},
};

bindContextMenuHandlers(self);

console.log('Handler registered on document?');
console.log('document event listeners:', document.eventNames?.());

const actionsBtn = document.querySelector('[data-testid="show-comment-button"]');
console.log('actionsBtn:', actionsBtn?.tagName);

const cb = document.querySelector('.syh-checkbox');
console.log('checkbox before:', cb.checked);

const event = new MouseEvent('contextmenu', { bubbles: true, button: 2 });
let prevented = false;
event.preventDefault = () => { prevented = true; };
actionsBtn.dispatchEvent(event);

console.log('prevented:', prevented);
console.log('checkbox after:', cb.checked);
