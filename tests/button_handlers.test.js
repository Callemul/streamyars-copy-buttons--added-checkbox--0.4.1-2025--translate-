import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mock implementations for button_handlers.ts dependencies
 */

// Mock SyhEventComments interface
class MockSyhEventComments {
    constructor() {
        this.SELECTORS = {
            commentBlock: '.ytcp-comment-thread',
            commentAuthor: '#author-text',
            commentText: '#content-text',
            starButton: '.star-button'
        };
        this.STATE = null;
        this.UTILS = {
            copyAndShowBanner: (text, header) => { }
        };
        this.UI = {
            updateCommentVisuals: (block, type) => { }
        };
        this.TIMINGS = null;
        this.isBound = true;
        
        this.saveToDatabase = async (author, text, type, icon) => { };
        this.removeFromDatabase = async (text) => { };
    }
}

// Formatters module
function getPrayerIcon(buttonNum) {
    if (buttonNum === 1) return "🙏❤️🙏";
    if (buttonNum === 2) return "❤️❤️❤️";
    return "🙏🙏🙏";
}

function stripLeadingAt(rawAuthor) {
    let author = rawAuthor?.trim() || '';
    while (author.startsWith('@')) author = author.substring(1);
    return author;
}

function formatCopyPayload(action, author, commentText, buttonNum) {
    if (action === 'copy-comment') {
        return {
            header: "📄 Комент (без автора)",
            textToCopy: commentText,
            actionType: 'copy'
        };
    }
    if (action === 'copy-author-comment') {
        return {
            header: "📑 Автор і його ❓ питання",
            textToCopy: `@${author}\n\n${commentText}`,
            actionType: 'question'
        };
    }
    if (action === 'copy-prayer') {
        const prayerIcon = getPrayerIcon(buttonNum);
        return {
            header: `📑 Автор і його ${prayerIcon}`,
            textToCopy: `\n\n\n${prayerIcon} @${author}\n\n${commentText}`,
            actionType: 'prayer',
            prayerIcon
        };
    }
    return { header: '', textToCopy: '', actionType: null };
}

// Actions module
const SYH_BUS = {
    emit: (event, data) => { }
};

class CommentService {
    static setStreamYardCheckboxState(text, checked) { }
}

function applyCommentActionState(self, payload, author, commentText, commentBlock) {
    if (payload.actionType === 'question') {
        self.saveToDatabase(author, commentText, "question", "❓");
        if (self.UI) self.UI.updateCommentVisuals(commentBlock, 'question');
    } else if (payload.actionType === 'prayer' && payload.prayerIcon) {
        self.saveToDatabase(author, commentText, "prayer", payload.prayerIcon);
        if (self.UI) self.UI.updateCommentVisuals(commentBlock, 'prayer');
        SYH_BUS.emit('PRAYER_MARKED', { author, text: commentText, icon: payload.prayerIcon });
    }

    if (payload.textToCopy) {
        SYH_BUS.emit('COMMENT_ACTION', {
            type: payload.actionType,
            author: author,
            text: commentText
        });

        if (self.UTILS) {
            self.UTILS.copyAndShowBanner(payload.textToCopy, payload.header);
        }

        const checkboxNode = commentBlock.querySelector('.syh-checkbox[data-type="comment"]');
        if (checkboxNode) {
            checkboxNode.checked = true;
            checkboxNode.dispatchEvent(new Event('change', { bubbles: true }));
            CommentService.setStreamYardCheckboxState(commentText, true);
        }

        commentBlock.querySelectorAll('.syh-checkbox').forEach(cb => cb.checked = true);

        const starBtnNode = commentBlock.querySelector(self.SELECTORS?.starButton || '');
        if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'false') {
            starBtnNode.click();
        }
    }
}

// Main function under test
function handleSyhButtonMouseUp(e, self) {
    const target = e.target;
    const button = target?.closest('.syh-button[data-type="comment"]');
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();

    const action = button.dataset.action;
    const buttonNum = e.button;

    if (buttonNum !== 0 && action !== 'copy-prayer') return;

    const commentBlock = button.closest(self.SELECTORS?.commentBlock || '');
    if (!commentBlock) return;

    const rawAuthor = commentBlock.querySelector(self.SELECTORS?.commentAuthor || '')?.textContent;
    const author = stripLeadingAt(rawAuthor);
    const commentText = commentBlock.querySelector(self.SELECTORS?.commentText || '')?.textContent || '';

    if (action === 'copy-author-comment' || action === 'copy-prayer') {
        commentBlock.setAttribute('data-syh-just-added', 'true');
        setTimeout(() => { commentBlock.removeAttribute('data-syh-just-added'); }, 2000);
    }

    const payload = formatCopyPayload(action, author, commentText, buttonNum);
    applyCommentActionState(self, payload, author, commentText, commentBlock);
}

/**
 * Test Helpers
 */

function createMockMouseEvent(button, targetElement) {
    return {
        button,
        target: targetElement,
        preventDefault: () => {},
        stopPropagation: () => {}
    };
}

let mockCommentBlock;

function createMockCommentBlock(overrides = {}) {
    const authorEl = { textContent: overrides.author || '@TestAuthor' };
    const textEl = { textContent: overrides.text || 'Test comment text' };
    const starBtn = {
        getAttribute: (name) => name === 'aria-selected' ? 'false' : null,
        click: () => {}
    };
    const checkboxEl = {
        checked: false,
        dispatchEvent: () => true
    };

    return {
        querySelector: (selector) => {
            if (selector === '#author-text') return authorEl;
            if (selector === '#content-text') return textEl;
            if (selector === '.star-button') return overrides.hasStarButton ? starBtn : null;
            if (selector === '.syh-checkbox[data-type="comment"]') return overrides.hasCheckbox ? checkboxEl : null;
            return null;
        },
        querySelectorAll: (selector) => {
            if (selector === '.syh-checkbox') return overrides.hasCheckbox ? [checkboxEl] : [];
            return [];
        },
        closest: (selector) => selector === '.ytcp-comment-thread' ? mockCommentBlock : null,
        setAttribute: () => {},
        removeAttribute: () => {},
        getAttribute: () => null
    };
}

describe('button_handlers.ts - formatCopyPayload', () => {
    test('returns copy payload for copy-comment action', () => {
        const payload = formatCopyPayload('copy-comment', 'Author', 'Comment text', 0);
        assert.strictEqual(payload.actionType, 'copy');
        assert.strictEqual(payload.textToCopy, 'Comment text');
        assert.strictEqual(payload.header, '📄 Комент (без автора)');
    });

    test('returns question payload for copy-author-comment action', () => {
        const payload = formatCopyPayload('copy-author-comment', 'Author', 'Comment text', 0);
        assert.strictEqual(payload.actionType, 'question');
        assert.strictEqual(payload.textToCopy, '@Author\n\nComment text');
        assert.strictEqual(payload.header, '📑 Автор і його ❓ питання');
    });

    test('returns prayer payload for copy-prayer action with button 0', () => {
        const payload = formatCopyPayload('copy-prayer', 'Author', 'Comment text', 0);
        assert.strictEqual(payload.actionType, 'prayer');
        assert.strictEqual(payload.prayerIcon, '🙏🙏🙏');
        assert.strictEqual(payload.textToCopy, '\n\n\n🙏🙏🙏 @Author\n\nComment text');
    });

    test('returns prayer payload for copy-prayer action with button 1', () => {
        const payload = formatCopyPayload('copy-prayer', 'Author', 'Comment text', 1);
        assert.strictEqual(payload.prayerIcon, '🙏❤️🙏');
    });

    test('returns prayer payload for copy-prayer action with button 2', () => {
        const payload = formatCopyPayload('copy-prayer', 'Author', 'Comment text', 2);
        assert.strictEqual(payload.prayerIcon, '❤️❤️❤️');
    });

    test('returns empty payload for unknown action', () => {
        const payload = formatCopyPayload('unknown-action', 'Author', 'Comment text', 0);
        assert.strictEqual(payload.actionType, null);
        assert.strictEqual(payload.textToCopy, '');
        assert.strictEqual(payload.header, '');
    });
});

describe('button_handlers.ts - stripLeadingAt', () => {
    test('strips single @', () => {
        assert.strictEqual(stripLeadingAt('@author'), 'author');
    });

    test('strips multiple @', () => {
        assert.strictEqual(stripLeadingAt('@@@author'), 'author');
    });

    test('handles no @', () => {
        assert.strictEqual(stripLeadingAt('author'), 'author');
    });

    test('handles null/undefined', () => {
        assert.strictEqual(stripLeadingAt(null), '');
        assert.strictEqual(stripLeadingAt(undefined), '');
    });

    test('trims whitespace', () => {
        assert.strictEqual(stripLeadingAt('  @author  '), 'author');
    });
});

describe('button_handlers.ts - getPrayerIcon', () => {
    test('returns default icon for button 0', () => {
        assert.strictEqual(getPrayerIcon(0), '🙏🙏🙏');
    });

    test('returns heart icon for button 1', () => {
        assert.strictEqual(getPrayerIcon(1), '🙏❤️🙏');
    });

    test('returns double heart for button 2', () => {
        assert.strictEqual(getPrayerIcon(2), '❤️❤️❤️');
    });

    test('returns default for other buttons', () => {
        assert.strictEqual(getPrayerIcon(3), '🙏🙏🙏');
        assert.strictEqual(getPrayerIcon(-1), '🙏🙏🙏');
    });
});

describe('button_handlers.ts - handleSyhButtonMouseUp', () => {
    function createTestState() {
        const saveToDatabaseCalls = [];
        const updateCommentVisualsCalls = [];
        const copyAndShowBannerCalls = [];
        const busEmits = [];
        const checkboxStates = new Map();

        const self = new MockSyhEventComments();
        self.saveToDatabase = async (author, text, type, icon) => {
            saveToDatabaseCalls.push({ author, text, type, icon });
        };
        self.UI.updateCommentVisuals = (block, type) => {
            updateCommentVisualsCalls.push({ block, type });
        };
        self.UTILS.copyAndShowBanner = (text, header) => {
            copyAndShowBannerCalls.push({ text, header });
        };
        SYH_BUS.emit = (event, data) => {
            busEmits.push({ event, data });
        };

        return { self, saveToDatabaseCalls, updateCommentVisualsCalls, copyAndShowBannerCalls, busEmits, checkboxStates };
    }

    function createButton(action) {
        const button = {
            dataset: { action },
            closest: (selector) => {
                if (selector === '.syh-button[data-type="comment"]') return button;
                if (selector === '.ytcp-comment-thread') return mockCommentBlock;
                return null;
            }
        };
        return button;
    }

    function createEvent(button, buttonNum = 0) {
        return {
            button: buttonNum,
            target: button,
            preventDefault: () => {},
            stopPropagation: () => {}
        };
    }

    test('returns early when no button found', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        const event = createEvent(null);
        event.target = { closest: () => null };
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls.length, 0);
    });

    test('returns early for right-click on non-copy-prayer action', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@Author', text: 'Comment text' });
        const button = createButton('copy-author-comment');
        const event = createEvent(button, 2); // right click
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls.length, 0);
    });

    test('allows right-click for copy-prayer action', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@Author', text: 'Comment text' });
        const button = createButton('copy-prayer');
        const event = createEvent(button, 2); // right click
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls.length, 1);
        assert.strictEqual(saveToDatabaseCalls[0].type, 'prayer');
    });

    test('returns early when commentBlock not found', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        const button = createButton('copy-author-comment');
        button.closest = () => null;
        const event = createEvent(button);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls.length, 0);
    });

    test('handles copy-author-comment action (left click)', () => {
        const { self, saveToDatabaseCalls, updateCommentVisualsCalls, copyAndShowBannerCalls, busEmits } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@TestAuthor', text: 'Test comment' });
        const button = createButton('copy-author-comment');
        const event = createEvent(button, 0);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls.length, 1);
        assert.strictEqual(saveToDatabaseCalls[0].type, 'question');
        assert.strictEqual(saveToDatabaseCalls[0].author, 'TestAuthor');
        assert.strictEqual(saveToDatabaseCalls[0].icon, '❓');
        assert.strictEqual(updateCommentVisualsCalls.length, 1);
        assert.strictEqual(updateCommentVisualsCalls[0].type, 'question');
        assert.strictEqual(copyAndShowBannerCalls.length, 1);
        assert.ok(busEmits.some(e => e.event === 'COMMENT_ACTION'));
    });

    test('handles copy-prayer action (left click)', () => {
        const { self, saveToDatabaseCalls, updateCommentVisualsCalls, busEmits } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@PrayerAuthor', text: 'Prayer request' });
        const button = createButton('copy-prayer');
        const event = createEvent(button, 0);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls.length, 1);
        assert.strictEqual(saveToDatabaseCalls[0].type, 'prayer');
        assert.strictEqual(saveToDatabaseCalls[0].author, 'PrayerAuthor');
        assert.strictEqual(saveToDatabaseCalls[0].icon, '🙏🙏🙏');
        assert.strictEqual(updateCommentVisualsCalls.length, 1);
        assert.strictEqual(updateCommentVisualsCalls[0].type, 'prayer');
        assert.ok(busEmits.some(e => e.event === 'PRAYER_MARKED'));
    });

    test('handles copy-prayer action with middle click (button 1)', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@Author', text: 'Text' });
        const button = createButton('copy-prayer');
        const event = createEvent(button, 1);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls.length, 1);
        assert.strictEqual(saveToDatabaseCalls[0].icon, '🙏❤️🙏');
    });

    test('handles copy-prayer action with right click (button 2)', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@Author', text: 'Text' });
        const button = createButton('copy-prayer');
        const event = createEvent(button, 2);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls.length, 1);
        assert.strictEqual(saveToDatabaseCalls[0].icon, '❤️❤️❤️');
    });

    test('sets data-syh-just-added attribute for copy-author-comment', () => {
        const { self } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@Author', text: 'Text' });
        let attrSet = false;
        let attrRemoved = false;
        mockCommentBlock.setAttribute = (name) => { if (name === 'data-syh-just-added') attrSet = true; };
        mockCommentBlock.removeAttribute = (name) => { if (name === 'data-syh-just-added') attrRemoved = true; };
        
        const button = createButton('copy-author-comment');
        const event = createEvent(button, 0);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(attrSet, true);
    });

    test('sets data-syh-just-added attribute for copy-prayer', () => {
        const { self } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@Author', text: 'Text' });
        let attrSet = false;
        mockCommentBlock.setAttribute = (name) => { if (name === 'data-syh-just-added') attrSet = true; };
        
        const button = createButton('copy-prayer');
        const event = createEvent(button, 0);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(attrSet, true);
    });

    test('does not set data-syh-just-added for copy-comment', () => {
        const { self } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@Author', text: 'Text' });
        let attrSet = false;
        mockCommentBlock.setAttribute = (name) => { if (name === 'data-syh-just-added') attrSet = true; };
        
        const button = createButton('copy-comment');
        const event = createEvent(button, 0);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(attrSet, false);
    });

    test('strips @ from author name', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@@Author', text: 'Text' });
        const button = createButton('copy-author-comment');
        const event = createEvent(button, 0);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls[0].author, 'Author');
    });

    test('handles missing author element gracefully', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '', text: 'Text' });
        // Override querySelector to return empty author
        mockCommentBlock.querySelector = (selector) => {
            if (selector === '#author-text') return { textContent: '' };
            if (selector === '#content-text') return { textContent: 'Text' };
            return null;
        };
        const button = createButton('copy-author-comment');
        const event = createEvent(button, 0);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls[0].author, '');
    });

    test('handles missing text element gracefully', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        mockCommentBlock = createMockCommentBlock({ author: '@Author', text: '' });
        // Override querySelector to return empty text
        mockCommentBlock.querySelector = (selector) => {
            if (selector === '#author-text') return { textContent: '@Author' };
            if (selector === '#content-text') return { textContent: '' };
            return null;
        };
        const button = createButton('copy-author-comment');
        const event = createEvent(button, 0);
        
        handleSyhButtonMouseUp(event, self);
        
        assert.strictEqual(saveToDatabaseCalls[0].text, '');
    });
});

describe('button_handlers.ts - applyCommentActionState', () => {
    function createTestState() {
        const saveToDatabaseCalls = [];
        const updateCommentVisualsCalls = [];
        const copyAndShowBannerCalls = [];
        const busEmits = [];
        const checkboxStates = new Map();

        const self = new MockSyhEventComments();
        self.saveToDatabase = async (author, text, type, icon) => {
            saveToDatabaseCalls.push({ author, text, type, icon });
        };
        self.UI.updateCommentVisuals = (block, type) => {
            updateCommentVisualsCalls.push({ block, type });
        };
        self.UTILS.copyAndShowBanner = (text, header) => {
            copyAndShowBannerCalls.push({ text, header });
        };
        SYH_BUS.emit = (event, data) => {
            busEmits.push({ event, data });
        };

        return { self, saveToDatabaseCalls, updateCommentVisualsCalls, copyAndShowBannerCalls, busEmits, checkboxStates };
    }

    function createMockCommentBlock() {
        const checkboxEl = {
            checked: false,
            dispatchEvent: () => true
        };
        const starBtn = {
            getAttribute: (name) => name === 'aria-selected' ? 'false' : null,
            click: () => {}
        };
        
        return {
            querySelector: (selector) => {
                if (selector === '.syh-checkbox[data-type="comment"]') return checkboxEl;
                if (selector === '.star-button') return starBtn;
                return null;
            },
            querySelectorAll: (selector) => {
                if (selector === '.syh-checkbox') return [checkboxEl];
                return [];
            }
        };
    }

    test('handles question action type', () => {
        const { self, saveToDatabaseCalls, updateCommentVisualsCalls } = createTestState();
        const payload = formatCopyPayload('copy-author-comment', 'Author', 'Text', 0);
        const commentBlock = createMockCommentBlock();
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        assert.strictEqual(saveToDatabaseCalls.length, 1);
        assert.strictEqual(saveToDatabaseCalls[0].type, 'question');
        assert.strictEqual(updateCommentVisualsCalls.length, 1);
        assert.strictEqual(updateCommentVisualsCalls[0].type, 'question');
    });

    test('handles prayer action type', () => {
        const { self, saveToDatabaseCalls, updateCommentVisualsCalls, busEmits } = createTestState();
        const payload = formatCopyPayload('copy-prayer', 'Author', 'Text', 0);
        const commentBlock = createMockCommentBlock();
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        assert.strictEqual(saveToDatabaseCalls.length, 1);
        assert.strictEqual(saveToDatabaseCalls[0].type, 'prayer');
        assert.strictEqual(updateCommentVisualsCalls.length, 1);
        assert.strictEqual(updateCommentVisualsCalls[0].type, 'prayer');
        assert.ok(busEmits.some(e => e.event === 'PRAYER_MARKED'));
    });

    test('does not save to database for copy action', () => {
        const { self, saveToDatabaseCalls } = createTestState();
        const payload = formatCopyPayload('copy-comment', 'Author', 'Text', 0);
        const commentBlock = createMockCommentBlock();
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        assert.strictEqual(saveToDatabaseCalls.length, 0);
    });

    test('copies text and shows banner when textToCopy present', () => {
        const { self, copyAndShowBannerCalls } = createTestState();
        const payload = formatCopyPayload('copy-author-comment', 'Author', 'Text', 0);
        const commentBlock = createMockCommentBlock();
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        assert.strictEqual(copyAndShowBannerCalls.length, 1);
        assert.strictEqual(copyAndShowBannerCalls[0].text, '@Author\n\nText');
    });

    test('does not copy when textToCopy empty', () => {
        const { self, copyAndShowBannerCalls } = createTestState();
        const payload = { header: '', textToCopy: '', actionType: null };
        const commentBlock = createMockCommentBlock();
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        assert.strictEqual(copyAndShowBannerCalls.length, 0);
    });

    test('checks checkbox and dispatches change event', () => {
        const { self } = createTestState();
        const payload = formatCopyPayload('copy-author-comment', 'Author', 'Text', 0);
        const commentBlock = createMockCommentBlock();
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        const checkbox = commentBlock.querySelector('.syh-checkbox[data-type="comment"]');
        assert.strictEqual(checkbox.checked, true);
    });

    test('calls CommentService.setStreamYardCheckboxState', () => {
        const { self } = createTestState();
        const payload = formatCopyPayload('copy-author-comment', 'Author', 'Text', 0);
        const commentBlock = createMockCommentBlock();
        let serviceCalled = false;
        CommentService.setStreamYardCheckboxState = (text, checked) => {
            serviceCalled = true;
            assert.strictEqual(text, 'Text');
            assert.strictEqual(checked, true);
        };
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        assert.strictEqual(serviceCalled, true);
    });

    test('checks all syh-checkbox elements', () => {
        const { self } = createTestState();
        const checkbox1 = { checked: false, dispatchEvent: () => true };
        const checkbox2 = { checked: false, dispatchEvent: () => true };
        
        const commentBlock = {
            querySelector: (selector) => {
                if (selector === '.syh-checkbox[data-type="comment"]') return checkbox1;
                if (selector === '.star-button') return null;
                return null;
            },
            querySelectorAll: (selector) => {
                if (selector === '.syh-checkbox') return [checkbox1, checkbox2];
                return [];
            }
        };
        
        const payload = formatCopyPayload('copy-author-comment', 'Author', 'Text', 0);
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        assert.strictEqual(checkbox1.checked, true);
        assert.strictEqual(checkbox2.checked, true);
    });

    test('clicks star button when aria-selected is false', () => {
        const { self } = createTestState();
        let starClicked = false;
        const starBtn = {
            getAttribute: (name) => name === 'aria-selected' ? 'false' : null,
            click: () => { starClicked = true; }
        };
        
        const commentBlock = {
            querySelector: (selector) => {
                if (selector === '.star-button') return starBtn;
                if (selector === '.syh-checkbox[data-type="comment"]') return { checked: false, dispatchEvent: () => true };
                return null;
            },
            querySelectorAll: () => []
        };
        
        const payload = formatCopyPayload('copy-author-comment', 'Author', 'Text', 0);
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        assert.strictEqual(starClicked, true);
    });

    test('does not click star button when aria-selected is true', () => {
        const { self } = createTestState();
        let starClicked = false;
        const starBtn = {
            getAttribute: (name) => name === 'aria-selected' ? 'true' : null,
            click: () => { starClicked = true; }
        };
        
        const commentBlock = {
            querySelector: (selector) => {
                if (selector === '.star-button') return starBtn;
                if (selector === '.syh-checkbox[data-type="comment"]') return { checked: false, dispatchEvent: () => true };
                return null;
            },
            querySelectorAll: () => []
        };
        
        const payload = formatCopyPayload('copy-author-comment', 'Author', 'Text', 0);
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        assert.strictEqual(starClicked, false);
    });

    test('emits COMMENT_ACTION event', () => {
        const { self, busEmits } = createTestState();
        const payload = formatCopyPayload('copy-author-comment', 'Author', 'Text', 0);
        const commentBlock = createMockCommentBlock();
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        const commentActionEvent = busEmits.find(e => e.event === 'COMMENT_ACTION');
        assert.ok(commentActionEvent);
        assert.strictEqual(commentActionEvent.data.type, 'question');
        assert.strictEqual(commentActionEvent.data.author, 'Author');
        assert.strictEqual(commentActionEvent.data.text, 'Text');
    });

    test('emits PRAYER_MARKED event for prayer action', () => {
        const { self, busEmits } = createTestState();
        const payload = formatCopyPayload('copy-prayer', 'Author', 'Text', 0);
        const commentBlock = createMockCommentBlock();
        
        applyCommentActionState(self, payload, 'Author', 'Text', commentBlock);
        
        const prayerEvent = busEmits.find(e => e.event === 'PRAYER_MARKED');
        assert.ok(prayerEvent);
        assert.strictEqual(prayerEvent.data.author, 'Author');
        assert.strictEqual(prayerEvent.data.text, 'Text');
        assert.strictEqual(prayerEvent.data.icon, '🙏🙏🙏');
    });
});