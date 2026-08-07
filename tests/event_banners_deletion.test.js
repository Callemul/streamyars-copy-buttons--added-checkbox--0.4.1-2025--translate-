import assert from 'node:assert';
import { test, describe, beforeEach, afterEach } from 'node:test';

const { 
    calculateBannerDeletionCounts, 
    buildBannerDeleteConfirmMessage, 
    executeBannerDeletion,
    handleDeleteSelectedBannersAction
} = await import('../modules/event_banners/deletion.ts');

describe('event_banners/deletion tests', () => {
    let mockCheckboxes;
    let mockSelectors;
    let mockUi;
    let originalConfirm;
    let originalDocument;

    beforeEach(() => {
        originalConfirm = global.confirm;
        global.confirm = () => true;

        mockSelectors = {
            bannerBlock: '.banner-block',
            bannerText: '.banner-text',
            bannerDeleteButton: '.delete-btn'
        };

        mockCheckboxes = [
            createMockCheckbox('stream', true),
            createMockCheckbox('audience', true),
            createMockCheckbox('prayer', true),
            createMockCheckbox('stream', true),
            createMockCheckbox('none', true)
        ];

        mockUi = {
            bannerCategoriesCache: {
                'Stream banner': 'stream',
                'Audience banner': 'audience',
                'Prayer banner': 'prayer',
                'Stream banner 2': 'stream',
                'Unknown banner': 'none'
            },
            bannerActiveFilter: 'stream'
        };

        setupMockDocument();
    });

    afterEach(() => {
        global.confirm = originalConfirm;
        global.document = originalDocument;
    });

    function createMockCheckbox(category, checked = true) {
        const checkbox = {
            checked,
            dataset: { type: 'banner' },
            closest: (selector) => {
                if (selector === '.banner-block') {
                    return createMockBannerBlock(category);
                }
                return null;
            }
        };
        return checkbox;
    }

    function createMockBannerBlock(category) {
        const textMap = {
            'stream': 'Stream banner',
            'audience': 'Audience banner',
            'prayer': 'Prayer banner',
            'none': 'Unknown banner'
        };
        return {
            querySelector: (selector) => {
                if (selector === '.banner-text') {
                    return { textContent: textMap[category] || 'Unknown banner' };
                }
                if (selector === '.delete-btn') {
                    return { click: () => {} };
                }
                return null;
            }
        };
    }

    function setupMockDocument() {
        originalDocument = global.document;
        global.document = {
            querySelectorAll: (selector) => {
                if (selector === '.syh-checkbox[data-type="banner"]:checked') {
                    return mockCheckboxes;
                }
                return [];
            },
            createElement: () => ({ style: {}, appendChild: () => {}, setAttribute: () => {} }),
            body: { appendChild: () => {} }
        };
    }

    describe('calculateBannerDeletionCounts', () => {
        test('should return correct counts for mixed categories', () => {
            const result = calculateBannerDeletionCounts(mockCheckboxes, mockSelectors, mockUi, 'stream');

            assert.strictEqual(result.counts.all, 5);
            assert.strictEqual(result.counts.stream, 2);
            assert.strictEqual(result.counts.audience, 1);
            assert.strictEqual(result.counts.prayer, 1);
            assert.strictEqual(result.currentTabCount, 2);
        });

        test('should handle empty checkbox list', () => {
            const result = calculateBannerDeletionCounts([], mockSelectors, mockUi, 'stream');

            assert.strictEqual(result.counts.all, 0);
            assert.strictEqual(result.counts.stream, 0);
            assert.strictEqual(result.counts.audience, 0);
            assert.strictEqual(result.counts.prayer, 0);
            assert.strictEqual(result.currentTabCount, 0);
        });

        test('should handle null ui gracefully', () => {
            const result = calculateBannerDeletionCounts(mockCheckboxes, mockSelectors, null, 'stream');

            assert.strictEqual(result.counts.all, 5);
            assert.strictEqual(result.counts.stream, 0);
            assert.strictEqual(result.counts.audience, 0);
            assert.strictEqual(result.counts.prayer, 0);
            assert.strictEqual(result.currentTabCount, 0);
        });

        test('should handle null selectors gracefully', () => {
            const result = calculateBannerDeletionCounts(mockCheckboxes, null, mockUi, 'stream');

            assert.strictEqual(result.counts.all, 5);
            assert.strictEqual(result.currentTabCount, 0);
        });

        test('should filter by activeFilter correctly for audience', () => {
            mockUi.bannerActiveFilter = 'audience';
            const result = calculateBannerDeletionCounts(mockCheckboxes, mockSelectors, mockUi, 'audience');
            assert.strictEqual(result.currentTabCount, 1);
        });

        test('should filter by activeFilter correctly for prayer', () => {
            mockUi.bannerActiveFilter = 'prayer';
            const result = calculateBannerDeletionCounts(mockCheckboxes, mockSelectors, mockUi, 'prayer');
            assert.strictEqual(result.currentTabCount, 1);
        });
    });

    describe('buildBannerDeleteConfirmMessage', () => {
        const counts = { all: 5, stream: 2, audience: 1, prayer: 1 };

        test('should build message for stream filter with items on tab', () => {
            const msg = buildBannerDeleteConfirmMessage('stream', 2, counts);
            assert.ok(msg.includes('Ефір'));
            assert.ok(msg.includes('2 банер'));
            assert.ok(msg.includes('Всі: 5'));
            assert.ok(msg.includes('Ефір: 2'));
            assert.ok(msg.includes('Глядачі: 1'));
            assert.ok(msg.includes('Молитви: 1'));
        });

        test('should build message for audience filter with items on tab', () => {
            const msg = buildBannerDeleteConfirmMessage('audience', 1, counts);
            assert.ok(msg.includes('Глядачі'));
            assert.ok(msg.includes('1 банер'));
        });

        test('should build message for prayer filter with items on tab', () => {
            const msg = buildBannerDeleteConfirmMessage('prayer', 1, counts);
            assert.ok(msg.includes('Молитви'));
            assert.ok(msg.includes('1 банер'));
        });

        test('should build warning message when no items on current tab', () => {
            const msg = buildBannerDeleteConfirmMessage('stream', 0, counts);
            assert.ok(msg.includes('не вибрано жодного банера'));
            assert.ok(msg.includes('на інших вкладках'));
            assert.ok(msg.includes('Всі: 5'));
        });

        test('should handle unknown filter name', () => {
            const msg = buildBannerDeleteConfirmMessage('unknown', 1, counts);
            assert.ok(msg.includes('unknown'));
        });
    });

    describe('executeBannerDeletion', () => {
        test('should click delete buttons for all checked banners', () => {
            let clickCount = 0;
            const checkboxesWithClicks = mockCheckboxes.map(cb => ({
                ...cb,
                closest: (selector) => {
                    if (selector === '.banner-block') {
                        return {
                            querySelector: (sel) => {
                                if (sel === '.delete-btn') {
                                    return { click: () => { clickCount++; } };
                                }
                                return null;
                            }
                        };
                    }
                    return null;
                }
            }));

            executeBannerDeletion(checkboxesWithClicks, mockSelectors);
            assert.strictEqual(clickCount, 5);
        });

        test('should handle missing delete button gracefully', () => {
            const checkboxesNoDelete = mockCheckboxes.map(cb => ({
                ...cb,
                closest: (selector) => {
                    if (selector === '.banner-block') {
                        return { querySelector: () => null };
                    }
                    return null;
                }
            }));

            assert.doesNotThrow(() => executeBannerDeletion(checkboxesNoDelete, mockSelectors));
        });

        test('should handle null selectors gracefully', () => {
            assert.doesNotThrow(() => executeBannerDeletion(mockCheckboxes, null));
        });
    });

    describe('handleDeleteSelectedBannersAction', () => {
        test('should return early when no checkboxes checked', () => {
            global.document.querySelectorAll = () => [];
            assert.doesNotThrow(() => handleDeleteSelectedBannersAction(mockSelectors, mockUi));
        });

        test('should call confirm with correct message for specific filter', () => {
            let confirmedMessage = '';
            global.confirm = (msg) => { confirmedMessage = msg; return true; };

            handleDeleteSelectedBannersAction(mockSelectors, mockUi);
            assert.ok(confirmedMessage.includes('Ефір'));
            assert.ok(confirmedMessage.includes('2 банер'));
        });

        test('should call confirm with simple message for "all" filter', () => {
            mockUi.bannerActiveFilter = 'all';
            let confirmedMessage = '';
            global.confirm = (msg) => { confirmedMessage = msg; return true; };

            handleDeleteSelectedBannersAction(mockSelectors, mockUi);
            assert.ok(confirmedMessage.includes('5 банер'));
        });

        test('should not execute deletion when user cancels', () => {
            global.confirm = () => false;
            let deletionExecuted = false;
            
            const checkboxesWithSpy = mockCheckboxes.map(cb => ({
                ...cb,
                closest: (selector) => {
                    if (selector === '.banner-block') {
                        return {
                            querySelector: (sel) => {
                                if (sel === '.delete-btn') {
                                    return { click: () => { deletionExecuted = true; } };
                                }
                                return null;
                            }
                        };
                    }
                    return null;
                }
            }));

            global.document.querySelectorAll = () => checkboxesWithSpy;
            handleDeleteSelectedBannersAction(mockSelectors, mockUi);
            assert.strictEqual(deletionExecuted, false);
        });
    });
});