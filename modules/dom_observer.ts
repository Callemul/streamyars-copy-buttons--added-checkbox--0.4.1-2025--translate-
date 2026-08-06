export type DomHandler = (element: Element) => void;

interface SelectorRegistration {
    selector: string;
    onAdded?: DomHandler;
    onRemoved?: DomHandler;
}

/**
 * Перевіряє та викликає відповідний обробник реєстрації для елемента та його дітей.
 */
function notifyMatchingElements(
    element: Element,
    registration: SelectorRegistration,
    type: 'added' | 'removed'
): void {
    const handler = type === 'added' ? registration.onAdded : registration.onRemoved;
    if (!handler) return;

    if (element.matches && element.matches(registration.selector)) {
        handler(element);
    } else if (element.querySelectorAll) {
        const children = element.querySelectorAll(registration.selector);
        for (let i = 0; i < children.length; i++) {
            handler(children[i]);
        }
    }
}

/**
 * Обробляє список доданих/видалених вузлів без створення проміжних масивів.
 */
function processNodeList(
    nodes: NodeList,
    registrations: SelectorRegistration[],
    type: 'added' | 'removed'
): void {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;

        for (let j = 0; j < registrations.length; j++) {
            notifyMatchingElements(el, registrations[j], type);
        }
    }
}

export class DomObserverService {
    private observer: MutationObserver | null = null;
    private registrations: SelectorRegistration[] = [];
    private pendingMutations: MutationRecord[] = [];
    private isScheduled = false;
    private targetContainer: Element | null = null;

    public register(selector: string, onAdded?: DomHandler, onRemoved?: DomHandler): () => void {
        const reg = { selector, onAdded, onRemoved };
        this.registrations.push(reg);

        return () => {
            this.registrations = this.registrations.filter(r => r !== reg);
        };
    }

    public start(container: Element = document.body): void {
        this.stop();
        this.targetContainer = container;

        this.observer = new MutationObserver((mutations) => {
            this.pendingMutations.push(...mutations);
            this.scheduleFlush();
        });

        this.observer.observe(this.targetContainer, {
            childList: true,
            subtree: true
        });
    }

    public stop(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.pendingMutations = [];
        this.isScheduled = false;
    }

    private scheduleFlush(): void {
        if (this.isScheduled) return;
        this.isScheduled = true;

        const flush = () => {
            this.isScheduled = false;
            const mutations = this.pendingMutations;
            this.pendingMutations = [];
            this.processMutations(mutations);
        };

        if (document.hidden) {
            setTimeout(flush, 200);
        } else {
            requestAnimationFrame(flush);
        }
    }

    private processMutations(mutations: MutationRecord[]): void {
        if (this.registrations.length === 0 || mutations.length === 0) return;

        const regs = this.registrations;
        for (let i = 0; i < mutations.length; i++) {
            const mutation = mutations[i];
            if (mutation.addedNodes.length > 0) {
                processNodeList(mutation.addedNodes, regs, 'added');
            }
            if (mutation.removedNodes.length > 0) {
                processNodeList(mutation.removedNodes, regs, 'removed');
            }
        }
    }
}

export const SYH_DOM_OBSERVER = new DomObserverService();

