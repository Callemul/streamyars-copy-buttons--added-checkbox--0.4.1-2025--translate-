/**
 * StreamYard Helper — чисті текстові перетворення.
 *
 * Винесено з `modules/utils.ts` (310 рядків, cyclomatic 84 / cognitive 51,
 * fan_in 22 за звітом Fallow), де ці таблиці символів займали ~130 рядків
 * усередині об'єкта-фасада `SYH_UTILS`.
 *
 * Функції навмисно НЕ використовують `this`: фасад лишається єдиним місцем,
 * де живе пізнє зв'язування (`transliterate`/`switchKeyboardLayout` проганяють
 * результат через `this.normalizeText`, який споживач може підмінити).
 * Тому тут експортуються саме «сирі» варіанти (`*Raw`) без фінальної нормалізації.
 *
 * Поведінка збережена 1-в-1 (див. `tests/utils.test.js`, `tests/utils_facade.test.js`).
 */

import { TG_HEADER_CLEANUP_REGEX } from '../parsers/index';
import type { CleaningLogEntry } from './types';

/** Латинські гомогліфи → кириличні відповідники (порядок ключів впливає на результат). */
const HOMOGLYPH_MAP: Record<string, string> = {
    'a': 'а', 'e': 'е', 'o': 'о', 'i': 'і', 'c': 'с', 'p': 'р', 'x': 'х', 'y': 'у', 't': 'т', 'h': 'н'
};

/** Транслітерація латиниці в кирилицю; довші послідовності мають пріоритет (4 → 3 → 2 → 1 символ). */
const TRANSLITERATION_MAP: Record<string, string> = {
    'shch':'шч','ch':'ч','sh':'ш','zh':'ж','ts':'ц','tz':'ц','cz':'ц','kh':'х','ph':'ф','th':'т',
    'shia':'шия','chia':'чия','zhia':'жия',
    'dia':'дия','ria':'рия','lia':'лия','nia':'ния','sia':'сия','tia':'тия','via':'вия','zia':'зия',
    'fia':'фия','pia':'пия','mia':'мия','kia':'кия','gia':'гия','bia':'бия',
    'ct':'кт',
    'ya':'я','ia':'я','ja':'я','yu':'ю','iu':'ю','ju':'ю','ye':'є','ie':'є','je':'є','yo':'ё','jo':'йо',
    'ai':'ай','ay':'ай','aj':'ай','ei':'ей','ey':'ей','ej':'ей','oi':'ой','oy':'ой','oj':'ой','ui':'уй','uy':'уй','uj':'уй',
    'a':'а','b':'б','v':'в','g':'г','d':'д','e':'е','z':'з','i':'и','y':'й','k':'к','l':'л','m':'м','n':'н','o':'о','p':'п','r':'р','s':'с','t':'т','u':'у','f':'ф','h':'х',
    'c':'ц','w':'в','x':'кс','q':'к','j':'дж'
};

/** Багатосимвольні згортки для «нечіткого» подання (застосовуються послідовно). */
const FUZZY_MULTI_MAP: [string, string][] = [
    ['shch', 'щ'], ['ch', 'ч'], ['sh', 'ш'], ['zh', 'ж'],
    ['ts', 'ц'], ['tz', 'ц'], ['cz', 'ц'],
    ['kh', 'х'], ['ph', 'ф'], ['th', 'т'],
    ['shia', 'шия'], ['chia', 'чия'], ['zhia', 'жия'],
    ['dia', 'дия'], ['ria', 'рия'], ['lia', 'лия'], ['nia', 'ния'],
    ['sia', 'сия'], ['tia', 'тия'], ['via', 'вия'], ['zia', 'зия'],
    ['fia', 'фия'], ['pia', 'пия'], ['mia', 'мия'], ['kia', 'кия'],
    ['gia', 'гия'], ['bia', 'бия'],
    ['ct', 'кт'],
    ['ya', 'я'], ['ia', 'я'], ['ja', 'я'],
    ['yu', 'ю'], ['iu', 'ю'], ['ju', 'ю'],
    ['ye', 'е'], ['ie', 'е'], ['je', 'е'],
    ['yo', 'е'], ['jo', 'е'],
    ['ai', 'аи'], ['ay', 'аи'], ['aj', 'аи'],
    ['ei', 'еи'], ['ey', 'еи'], ['ej', 'еи'],
    ['oi', 'ои'], ['oy', 'ои'], ['oj', 'ои'],
    ['ui', 'уи'], ['uy', 'уи'], ['uj', 'уи'],
    ['yi', 'и'], ['yy', 'и'], ['yj', 'и'],
    ['ия', 'я'], ['ія', 'я'], ['иа', 'я'], ['іа', 'я'], ['ие', 'е'], ['іє', 'е']
];

/** Односимвольні згортки: латиниця → кирилиця + уніфікація и/й/і/ї/ы та е/є/ё/э. */
const FUZZY_SINGLE_MAP: Record<string, string> = {
    'a': 'а', 'b': 'б', 'v': 'в', 'w': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
    'z': 'з', 'i': 'и', 'y': 'и', 'j': 'и', 'k': 'к', 'l': 'л', 'm': 'м',
    'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у',
    'f': 'ф', 'h': 'х', 'c': 'с', 'q': 'к', 'x': 'кс',
    'й': 'и', 'і': 'и', 'ї': 'и', 'ы': 'и',
    'є': 'е', 'ё': 'е', 'э': 'е',
    'ь': '', 'ъ': '', '\'': ''
};

/** QWERTY → ЙЦУКЕН: рятує пошук, набраний у неправильній розкладці. */
const KEYBOARD_LAYOUT_MAP: Record<string, string> = {
    'q':'й','w':'ц','e':'у','r':'к','t':'е','y':'н','u':'г','i':'ш','o':'щ','p':'з','[':'х',']':'ї',
    'a':'ф','s':'і','d':'в','f':'а','g':'п','h':'р','j':'о','k':'л','l':'д',';':'ж','\'':'є',
    'z':'я','x':'ч','c':'с','v':'м','b':'и','n':'т','m':'ь',',':'б','.':'ю'
};

/** Лоуеркейс + трім + заміна латинських гомогліфів на кириличні. */
export function normalizeText(str: string | null | undefined): string {
    if (!str) return "";
    let normalized = str.toLowerCase().trim();
    for (const char in HOMOGLYPH_MAP) {
        normalized = normalized.split(char).join(HOMOGLYPH_MAP[char]);
    }
    return normalized;
}

/**
 * Транслітерація без фінальної нормалізації.
 * Фасад зобов'язаний прогнати результат через `this.normalizeText`, щоб
 * зберегти оригінальний контракт `SYH_UTILS.transliterate`.
 */
export function transliterateRaw(str: string): string {
    let res = "";
    let i = 0;
    const s = str.toLowerCase();
    while (i < s.length) {
        if (i <= s.length - 4 && TRANSLITERATION_MAP[s.substring(i, i + 4)]) {
            res += TRANSLITERATION_MAP[s.substring(i, i + 4)];
            i += 4;
        } else if (i <= s.length - 3 && TRANSLITERATION_MAP[s.substring(i, i + 3)]) {
            res += TRANSLITERATION_MAP[s.substring(i, i + 3)];
            i += 3;
        } else if (i <= s.length - 2 && TRANSLITERATION_MAP[s.substring(i, i + 2)]) {
            res += TRANSLITERATION_MAP[s.substring(i, i + 2)];
            i += 2;
        } else if (TRANSLITERATION_MAP[s.charAt(i)]) {
            res += TRANSLITERATION_MAP[s.charAt(i)];
            i++;
        } else {
            res += s.charAt(i);
            i++;
        }
    }
    return res;
}

/** «Нечітке» подання рядка: згортає диграфи та прибирає ь/ъ/апостроф. */
export function toFuzzy(str: string | null | undefined): string {
    if (!str) return "";
    let s = str.toLowerCase().trim();

    for (const [pattern, replacement] of FUZZY_MULTI_MAP) {
        s = s.split(pattern).join(replacement);
    }

    let res = "";
    for (let i = 0; i < s.length; i++) {
        const char = s.charAt(i);
        res += FUZZY_SINGLE_MAP[char] !== undefined ? FUZZY_SINGLE_MAP[char] : char;
    }

    return res;
}

/**
 * Перекладання розкладки без фінальної нормалізації.
 * Як і `transliterateRaw`, доводиться до кінця у фасаді через `this.normalizeText`.
 */
export function switchKeyboardLayoutRaw(str: string): string {
    let res = "";
    const s = str.toLowerCase();
    for (let i = 0; i < s.length; i++) {
        const char = s.charAt(i);
        res += KEYBOARD_LAYOUT_MAP[char] || char;
    }
    return res;
}

/**
 * Прибирає службові заголовки Telegram (`[ДД.ММ.РРРР ГГ:ХХ] Автор:`).
 * Заголовок на початку тексту зникає повністю, усередині — замінюється на `\n`.
 * Якщо передано `cleaningLog`, туди дописується запис лише за наявності видалень.
 */
export function cleanTelegramHeaders(
    text: string | null | undefined,
    cleaningLog?: CleaningLogEntry[]
): string {
    if (!text) return "";
    const removedMatches: string[] = [];
    const cleaned = text.replace(TG_HEADER_CLEANUP_REGEX, (match, offset) => {
        removedMatches.push(match.trim());
        return offset === 0 ? "" : "\n";
    }).trim();

    if (cleaningLog && removedMatches.length > 0) {
        cleaningLog.push({
            before: text.trim(),
            after: cleaned,
            removed: removedMatches.join(' | ')
        });
    }
    return cleaned;
}

/** 
 * Зворотна транслітерація для тексту, зберігає винятки.
 * Мапа базується на TRANSLITERATION_MAP, але адаптована для нормального читання (напр. shch -> щ).
 */
export const REVERSE_TRANSLITERATION_MAP: Record<string, string> = {
    ...TRANSLITERATION_MAP,
    'shch': 'щ',
    'zh': 'ж',
    'ch': 'ч',
    'sh': 'ш',
    'ya': 'я',
    'yu': 'ю',
    'yo': 'ё',
    'ts': 'ц',
    'ei': 'ей',
    'j': 'ж',
    'y': 'ы',
    'y\'': 'ы',
    '\'': 'ь',
};

const REVERSE_WORD_OVERRIDES: Record<string, string> = {
    'BLAGODARU': 'БЛАГОДАРЮ',
    'BLAGODARNOST': 'БЛАГОДАРНОСТЬ',
    'SINOVIAX': 'СЫНОВЬЯХ',
    'moiu': 'мою',
    'bratia': 'братья'
};

/**
 * Зворотна транслітерація (Latin -> Cyrillic) з урахуванням регістру.
 * Використовує REVERSE_TRANSLITERATION_MAP.
 */
export function transliterateToCyrillic(latinText: string): string {
    let text = latinText;
    for (const [key, val] of Object.entries(REVERSE_WORD_OVERRIDES)) {
        text = text.replaceAll(key, val);
    }
    
    let res = "";
    let i = 0;
    while (i < text.length) {
        let matchedLen = 0;
        let mappedStr = "";
        
        for (let len = 4; len >= 1; len--) {
            if (i + len <= text.length) {
                const chunk = text.substring(i, i + len);
                const lowerChunk = chunk.toLowerCase();
                if (REVERSE_TRANSLITERATION_MAP[lowerChunk]) {
                    matchedLen = len;
                    const cyrillic = REVERSE_TRANSLITERATION_MAP[lowerChunk];
                    if (chunk === chunk.toUpperCase() && chunk !== chunk.toLowerCase()) {
                        mappedStr = cyrillic.toUpperCase();
                    } else if (len > 1 && chunk.charAt(0) === chunk.charAt(0).toUpperCase() && chunk.charAt(1) === chunk.charAt(1).toLowerCase()) {
                        mappedStr = cyrillic.charAt(0).toUpperCase() + cyrillic.slice(1);
                    } else {
                        mappedStr = cyrillic;
                    }
                    break;
                }
            }
        }
        
        if (matchedLen > 0) {
            res += mappedStr;
            i += matchedLen;
        } else {
            res += text[i];
            i++;
        }
    }
    return res;
}
