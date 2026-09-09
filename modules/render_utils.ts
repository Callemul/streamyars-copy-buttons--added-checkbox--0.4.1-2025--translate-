/**
 * Utility for batch rendering DOM elements.
 * Renders large lists in chunks (batches) using DocumentFragment and requestAnimationFrame / setTimeout,
 * preventing DOM freeze and UI jank when popups or lists load 100+ items.
 */

export interface BatchRenderOptions {
    /** Number of items to render per animation frame / chunk. Default is 25. */
    batchSize?: number;
    /** Whether to clear the container before rendering. Default is true. */
    clearContainer?: boolean;
    /** Optional callback executed when all batches are completed. */
    onComplete?: () => void;
}

/**
 * Renders items into a target container in DOM batches.
 * Returns a cancellation function that can abort pending frames.
 */
export function batchRenderItems<T>(
    container: HTMLElement,
    items: T[],
    renderItem: (item: T, index: number) => HTMLElement | null,
    options: BatchRenderOptions = {}
): () => void {
    const { batchSize = 25, clearContainer = true, onComplete } = options;

    let cancelled = false;
    let frameId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cancel = () => {
        cancelled = true;
        if (frameId !== null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(frameId);
            frameId = null;
        }
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    if (clearContainer) {
        container.innerHTML = '';
    }

    if (!items || items.length === 0) {
        if (onComplete) onComplete();
        return cancel;
    }

    let currentIndex = 0;

    function scheduleNextBatch() {
        if (typeof requestAnimationFrame === 'function') {
            frameId = requestAnimationFrame(renderBatch);
        } else {
            timeoutId = setTimeout(renderBatch, 0);
        }
    }

    function renderBatch() {
        frameId = null;
        timeoutId = null;

        if (cancelled) return;

        const fragment = document.createDocumentFragment();
        const limit = Math.min(currentIndex + batchSize, items.length);

        for (let i = currentIndex; i < limit; i++) {
            const item = items[i];
            if (item === undefined) continue;
            const el = renderItem(item, i);
            if (el) {
                fragment.appendChild(el);
            }
        }

        container.appendChild(fragment);
        currentIndex = limit;

        if (currentIndex < items.length && !cancelled) {
            scheduleNextBatch();
        } else {
            if (onComplete && !cancelled) {
                onComplete();
            }
        }
    }

    // Render the initial batch synchronously so popup loads immediately with zero delay
    renderBatch();

    return cancel;
}
