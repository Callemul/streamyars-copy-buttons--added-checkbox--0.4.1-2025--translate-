// popup_translit.ts
// Статична утиліта транслітерації тексту
import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';

import { transliterateToCyrillic } from '../modules/core/utils_text';

export function translitToRussian(translitText: string): string {
    return transliterateToCyrillic(translitText);
}

// Прив'язка події кліку перекладача
const translateBtn = document.getElementById('Translate');
if (translateBtn) {
    translateBtn.addEventListener('click', () => {
        const oldInput = document.getElementById('textArea1_oldText') as HTMLTextAreaElement | null;
        const newInput = document.getElementById('textArea2_generatedRuText') as HTMLTextAreaElement | null;
        const oldVal = oldInput?.value || '';
        const newVal = translitToRussian(oldVal);
        if (newInput) {
            newInput.value = newVal;
        }
        SYH_STORAGE.set({
            [STORAGE_KEYS.POPUP_TRANSLIT_OLD]: oldVal,
            [STORAGE_KEYS.POPUP_TRANSLIT_NEW]: newVal
        });
    });
}
