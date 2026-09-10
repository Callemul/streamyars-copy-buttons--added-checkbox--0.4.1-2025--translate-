// modules/parsers/truncation.ts
import { SYH_CONFIG } from '../registry/config';

const DEFAULT_MAX_LENGTH = 195;
const ELLIPSIS = "...";

export function getMaxLength(): number {
    return SYH_CONFIG?.LIMITS?.TEXT_TRUNCATION_LENGTH ?? DEFAULT_MAX_LENGTH;
}

export function truncate(text: string, maxLength?: number): string {
    const limit = maxLength ?? getMaxLength();
    if (text.length > limit) {
        return text.substring(0, limit - ELLIPSIS.length) + ELLIPSIS;
    }
    return text;
}

export function truncateWithLimit(text: string, limit: number): string {
    if (text.length > limit) {
        return text.substring(0, limit - ELLIPSIS.length) + ELLIPSIS;
    }
    return text;
}