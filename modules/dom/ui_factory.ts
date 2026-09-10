/**
 * StreamYard Helper - Centralized UI Element Factory
 * Забезпечує єдиний стиль, доступність (a11y) та DRY принцип для UI елементів розширення.
 */

export interface ButtonConfig {
    action: string;
    type?: string;
    icon: string;
    title: string;
    className?: string;
    onClick?: (e: MouseEvent) => void;
}

export class UiFactory {
    public static createButton(config: ButtonConfig): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `syh-button ${config.className || ''}`.trim();
        btn.innerHTML = `<span class="syh-icon">${config.icon}</span>`;
        btn.title = config.title;
        btn.setAttribute('aria-label', config.title);
        
        if (config.type) btn.dataset.type = config.type;
        if (config.action) btn.dataset.action = config.action;

        if (config.onClick) {
            btn.addEventListener('click', (e) => config.onClick!(e));
        }

        return btn;
    }

    public static createCheckbox(
        type: string,
        title: string,
        onChange?: (checked: boolean) => void
    ): { wrapper: HTMLElement; checkbox: HTMLInputElement } {
        const wrapper = document.createElement('div');
        wrapper.className = 'syh-checkbox-container';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'syh-checkbox';
        checkbox.dataset.type = type;
        checkbox.title = title;
        checkbox.setAttribute('aria-label', title);

        if (onChange) {
            checkbox.addEventListener('change', () => onChange(checkbox.checked));
        }

        wrapper.appendChild(checkbox);
        return { wrapper, checkbox };
    }
}