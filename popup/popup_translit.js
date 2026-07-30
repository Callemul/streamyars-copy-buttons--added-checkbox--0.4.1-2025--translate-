// popup_translit.js
// Статична утиліта транслітерації тексту
window.translitToRussian = function(translitText) {
    const translitMap = { "A": "А", "B": "Б", "V": "В", "G": "Г", "D": "Д", "E": "Е", "YO": "Ё", "J": "Ж", "ZH": "Ж", "Z": "З", "I": "И", "Y": "Й", "K": "К", "L": "Л", "M": "М", "N": "Н", "O": "О", "P": "П", "R": "Р", "S": "С", "T": "Т", "U": "У", "F": "Ф", "H": "Х", "C": "Ц", "CH": "Ч", "SH": "Ш", "SHCH": "Щ", "YU": "Ю", "YA": "Я", "'": "ь", "Y'": "Ы", "X": "Х", "\"": "\"", ":": ":", ";": ";", ".": ".", ",": ",", "!": "!", "?": "?", "%": "%", "*": "*", "(": "(", ")": ")", "-": "-", "_": "_", "@": "@", "~": "~", "a": "а", "b": "б", "v": "в", "g": "г", "d": "д", "e": "е", "yo": "ё", "j": "ж", "zh": "ж", "z": "з", "i": "и", "y": "ы", "k": "к", "l": "л", "m": "м", "n": "н", "o": "о", "p": "п", "r": "р", "s": "с", "t": "т", "u": "у", "f": "ф", "h": "х", "c": "ц", "ch": "ч", "sh": "ш", "shch": "щ", "Yu": "Ю", "yu": "ю", "Ya": "Я", "ya": "я", "y'": "ы", "x": "х" };
    translitText = translitText.replaceAll('BLAGODARU', 'БЛАГОДАРЮ').replaceAll('BLAGODARNOST', 'БЛАГОДАРНОСТЬ').replaceAll('SINOVIAX', 'СЫНОВЬЯХ').replaceAll('moiu', 'мою').replaceAll('bratia', 'братья');
    translitText = translitText.replaceAll('ts', 'ц').replaceAll('ei', 'ей').replaceAll('shch', 'щ').replaceAll('sh', 'ш').replaceAll('ch', 'ч').replaceAll('ya', 'я').replaceAll('yu', 'ю').replaceAll('yo', 'ё').replaceAll('zh', 'ж');
    translitText = translitText.replaceAll('TS', 'Ц').replaceAll('EI', 'ЕЙ').replaceAll('SHCH', 'Щ').replaceAll('SH', 'Ш').replaceAll('CH', 'Ч').replaceAll('YA', 'Я').replaceAll('YU', 'Ю').replaceAll('YO', 'Ё').replaceAll('ZH', 'Ж');
    
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
};

$(document).ready(function() {
    // Прив'язка події кліку перекладача
    $("#Translate").click(function() { 
        const oldVal = $("#textArea1_oldText").val();
        const newVal = window.translitToRussian(oldVal);
        $("#textArea2_generatedRuText").val(newVal); 
        chrome.storage.local.set({
            'tg_translit_old': oldVal,
            'tg_translit_new': newVal
        });
    });
});