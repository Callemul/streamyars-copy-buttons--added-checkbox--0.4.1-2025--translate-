import { SYH_CONFIG } from "/modules/config.ts.js";
export const SYH_COMMENT_ASSISTANT = {
  triggerWords: SYH_CONFIG?.TRIGGER_WORDS || ["вопрос"],
  selectors: SYH_CONFIG?.SELECTORS || {
    commentBlock: '[class*="PlatformComment__Wrap"]',
    commentText: '[class*="PlatformCommentShell__ContentSpan"]'
  },
  init(config) {
    if (config?.TRIGGER_WORDS) {
      this.triggerWords = config.TRIGGER_WORDS;
    }
    if (config?.SELECTORS) {
      this.selectors = config.SELECTORS;
    }
  },
  /**
   * Безпечна екранація HTML-символів
   */
  escapeHTML(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  },
  /**
   * Створення регулярного виразу з урахуванням кириличних меж слів
   * Використовує Unicode lookbehind/lookahead (?<![\p{L}\p{N}]) та (?![\p{L}\p{N}])
   */
  createTriggerRegExp(word) {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      return new RegExp(`(?<![\\p{L}\\p{N}])(${escapedWord})(?![\\p{L}\\p{N}])`, "giu");
    } catch (e) {
      return new RegExp(`(^|[^a-zA-Z0-9а-яА-ЯёЁіІїЇєЄґҐ])(${escapedWord})($|[^a-zA-Z0-9а-яА-ЯёЁіІїЇєЄґҐ])`, "gi");
    }
  },
  /**
   * Перевірка чи містить текст хоча б одне тригерне слово
   */
  hasTrigger(text) {
    if (!text || !this.triggerWords || this.triggerWords.length === 0) return false;
    return this.triggerWords.some((word) => {
      const rx = this.createTriggerRegExp(word);
      return rx.test(text);
    });
  },
  /**
   * Підсвічує тригерні слова у тексті за допомогою спец-тегу <mark class="syh-trigger-highlight">
   */
  highlightTriggers(text) {
    if (!text) return { highlightedText: "", matchedWords: [] };
    let safeHTML = this.escapeHTML(text);
    const matchedWords = [];
    this.triggerWords.forEach((word) => {
      const rx = this.createTriggerRegExp(word);
      safeHTML = safeHTML.replace(rx, (match, p1, p2, p3) => {
        const targetWord = p2 || p1 || match;
        if (!matchedWords.includes(word.toLowerCase())) {
          matchedWords.push(word.toLowerCase());
        }
        const replacement = `<mark class="syh-trigger-highlight" data-syh-trigger="${this.escapeHTML(word.toLowerCase())}">${targetWord}</mark>`;
        if (p2) {
          return `${p1}${replacement}${p3}`;
        }
        return replacement;
      });
    });
    return { highlightedText: safeHTML, matchedWords };
  },
  /**
   * Видаляє підсвічування (повертає чистий текст)
   */
  stripHighlights(text) {
    if (!text) return "";
    return text.replace(/<mark class="syh-trigger-highlight"[^>]*>(.*?)<\/mark>/gi, "$1");
  },
  /**
   * Головна функція обробки елемента коментаря
   * @param commentBlock DOM елемент коментаря
   * @returns boolean (чи було застосовано підсвічування)
   */
  processComment(commentBlock) {
    if (!commentBlock) return false;
    const textNode = commentBlock.querySelector(this.selectors.commentText || '[class*="PlatformCommentShell__ContentSpan"]');
    if (!textNode) return false;
    let originalText = textNode.getAttribute("data-syh-original-text");
    if (originalText === null) {
      originalText = textNode.textContent || "";
      textNode.setAttribute("data-syh-original-text", originalText);
    }
    const checkbox = commentBlock.querySelector('.syh-checkbox[data-type="comment"]');
    const isChecked = checkbox ? checkbox.checked : false;
    if (isChecked) {
      textNode.textContent = originalText;
      commentBlock.removeAttribute("data-syh-triggered");
      return false;
    }
    if (this.hasTrigger(originalText)) {
      const { highlightedText, matchedWords } = this.highlightTriggers(originalText);
      textNode.innerHTML = highlightedText;
      commentBlock.setAttribute("data-syh-triggered", matchedWords.join(","));
      return true;
    } else {
      textNode.textContent = originalText;
      commentBlock.removeAttribute("data-syh-triggered");
      return false;
    }
  },
  /**
   * Сканує всі коментарі у DOM та обробляє їх
   */
  processAllComments() {
    if (typeof document === "undefined") return;
    const selector = this.selectors.commentBlock || '[class*="PlatformComment__Wrap"]';
    const comments = document.querySelectorAll(selector);
    comments.forEach((block) => this.processComment(block));
  }
};
if (typeof window !== "undefined") {
  window.SYH_COMMENT_ASSISTANT = SYH_COMMENT_ASSISTANT;
}
