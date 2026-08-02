import { SYH_BUS } from './event_bus';

export type DomHandler = (element: Element) => void;

interface SelectorRegistration {
    selector: string;
    onAdded?: DomHandler;
    onRemoved?: DomHandler;
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
        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                const el = node as Element;

                for (const reg of this.registrations) {
                    if (!reg.onAdded) continue;
                    if (el.matches && el.matches(reg.selector)) {
                        reg.onAdded(el);
                    } else if (el.querySelectorAll) {
                        el.querySelectorAll(reg.selector).forEach(child => reg.onAdded!(child));
                    }
                }
            }

            for (const node of Array.from(mutation.removedNodes)) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                const el = node as Element;

                for (const reg of this.registrations) {
                    if (!reg.onRemoved) continue;
                    if (el.matches && el.matches(reg.selector)) {
                        reg.onRemoved(el);
                    } else if (el.querySelectorAll) {
                        el.querySelectorAll(reg.selector).forEach(child => reg.onRemoved!(child));
                    }
                }
            }
        }
    }
}

export const SYH_DOM_OBSERVER = new DomObserverService();