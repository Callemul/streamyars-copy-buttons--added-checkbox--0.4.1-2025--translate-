// popup_translit.ts
// Статична утиліта транслітерації тексту
import { SYH_STORAGE } from '../modules/storage';

export function translitToRussian(translitText: string): string {
    const translitMap: Record<string, string> = { "A": "А", "B": "Б", "V": "В", "G": "Г", "D": "Д", "E": "Е", "YO": "Ё", "J": "Ж", "ZH": "Ж", "Z": "З", "I": "И", "Y": "Й", "K": "К", "L": "Л", "M": "М", "N": "Н", "O": "О", "P": "П", "R": "Р", "S": "С", "T": "Т", "U": "У", "F": "Ф", "H": "Х", "C": "Ц", "CH": "Ч", "SH": "Ш", "SHCH": "Щ", "YU": "Ю", "YA": "Я", "'": "ь", "Y'": "Ы", "X": "Х", "\"": "\"", ":": ":", ";": ";", ".": ".", ",": ",", "!": "!", "?": "?", "%": "%", "*": "*", "(": "(", ")": ")", "-": "-", "_": "_", "@": "@", "~": "~", "a": "а", "b": "б", "v": "в", "g": "г", "d": "д", "e": "е", "yo": "ё", "j": "ж", "zh": "ж", "z": "з", "i": "и", "y": "ы", "k": "к", "l": "л", "m": "м", "n": "н", "o": "о", "p": "п", "r": "р", "s": "с", "t": "т", "u": "у", "f": "ф", "h": "х", "c": "ц", "ch": "ч", "sh": "ш", "shch": "щ", "Yu": "Ю", "yu": "ю", "Ya": "Я", "ya": "я", "y'": "ы", "x": "х" };

    const wordOverrides: Record<string, string> = {
        'BLAGODARU': 'БЛАГОДАРЮ',
        'BLAGODARNOST': 'БЛАГОДАРНОСТЬ',
        'SINOVIAX': 'СЫНОВЬЯХ',
        'moiu': 'мою',
        'bratia': 'братья'
    };

    for (const [key, val] of Object.entries(wordOverrides)) {
        translitText = translitText.replaceAll(key, val);
    }

    const digraphs: Record<string, string> = {
        'SHCH': 'Щ', 'shch': 'щ', 'ZH': 'Ж', 'zh': 'ж', 'CH': 'Ч', 'ch': 'ч',
        'SH': 'Ш', 'sh': 'ш', 'YA': 'Я', 'ya': 'я', 'YU': 'Ю', 'yu': 'ю',
        'YO': 'Ё', 'yo': 'ё', 'TS': 'Ц', 'ts': 'ц', 'EI': 'ЕЙ', 'ei': 'ей'
    };

    for (const [key, val] of Object.entries(digraphs)) {
        translitText = translitText.replaceAll(key, val);
    }
    
    const words = translitText.split(' ');
    const russianWords = words.map(word => {
        let russianWord = "";
        let curLetter = "";
        for (let i = 0; i < word.length; i++) {
            curLetter += word[i];
            if (translitMap[curLetter]) { 
                russianWord += translitMap[curLetter]; 
                curLetter = ""; 
            } else { 
                russianWord += word[i]; 
                curLetter = ""; 
            }
        }
        return russianWord;
    });
    return russianWords.join(' ');
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
            'tg_translit_old': oldVal,
            'tg_translit_new': newVal
        });
    });
}
