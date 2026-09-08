// options/defaults.ts
//
// Публічне обличчя налаштувань: тип стану і значення за замовчуванням.
// Обидва ВИВОДЯТЬСЯ з реєстру опцій `option_fields.ts` (T9), а не пишуться
// руками — раніше це були два з п'яти паралельних списків, які треба було
// тримати синхронними при кожній новій опції.
//
// Файл лишається точкою імпорту для решти проєкту: `OptionsState` і
// `DEFAULT_OPTIONS` імпортуються звідси, як і до T9.

import { buildDefaultOptions, type OptionsStateFromRegistry } from './option_fields';

export type OptionsState = OptionsStateFromRegistry;

export const DEFAULT_OPTIONS: OptionsState = buildDefaultOptions();
