import { enLocales } from './en';
import { zhCNLocales } from './zh-CN';
import { jaLocales } from './ja';
import type { LocaleStrings, Locale, LocaleStrings as LocaleStringsType } from './types';

export type { LocaleStrings, Locale };
export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './types';

/**
 * 所有支持的语言翻译集合
 */
export const LOCALES: Record<Locale, LocaleStringsType> = {
  en: enLocales,
  'zh-CN': zhCNLocales,
  ja: jaLocales,
};

/**
 * 语言配置信息
 */
export const LANGUAGE_CONFIG = {
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
  },
  'zh-CN': {
    name: 'Simplified Chinese',
    nativeName: '简体中文',
    flag: '🇨🇳',
  },
  ja: {
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
  },
} as const;

/**
 * 获取嵌套对象的值
 * @param obj 对象
 * @param path 路径，如 'home.searchPlaceholder'
 * @returns 值，如果找不到返回 undefined
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current?.[key] === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * 获取翻译文本（带fallback机制）
 * @param key 翻译键，如 'home.searchPlaceholder'
 * @param locale 语言
 * @returns 翻译文本，如果找不到则降级到英文，最后返回键本身
 */
export function getTranslation(key: string, locale: Locale): string {
  // 首先尝试获取指定语言的翻译
  const localeString = LOCALES[locale];
  let value = getNestedValue(localeString, key);

  if (value !== undefined) {
    return value;
  }

  // 如果指定语言没有，降级到英文
  const enString = LOCALES.en;
  value = getNestedValue(enString, key);

  if (value !== undefined) {
    return value;
  }

  // 最后返回键本身，便于调试
  console.warn(`Translation key not found: ${key}`);
  return key;
}

/**
 * 格式化翻译文本中的占位符
 * @param text 翻译文本，可能包含 {param} 形式的占位符
 * @param params 参数对象
 * @returns 格式化后的文本
 */
export function formatTranslation(
  text: string,
  params?: Record<string, string | number>
): string {
  if (!params) {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (_, key) => {
    return String(params[key] ?? `{${key}}`);
  });
}
