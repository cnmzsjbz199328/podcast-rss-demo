import {
  createContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import type { Locale } from '@/locales';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, getTranslation, formatTranslation } from '@/locales';

/**
 * LocaleContext 类型定义
 */
interface LocaleContextType {
  /** 当前选择的语言 */
  locale: Locale;
  /** 切换语言 */
  setLocale: (locale: Locale) => void;
  /** 获取翻译文本 */
  t: (key: string) => string;
  /** 获取并格式化翻译文本 */
  tf: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * 创建 LocaleContext
 * 使用 undefined 作为初值，在 Provider 中初始化
 */
export const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

/**
 * LocaleProvider Props
 */
interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

/**
 * 从 localStorage 读取保存的语言
 */
function getSavedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem('app-locale');
    // 验证保存的语言是否有效
    if (saved && SUPPORTED_LANGUAGES.includes(saved as Locale)) {
      return saved as Locale;
    }
  } catch (err) {
    console.error('Failed to read locale from localStorage:', err);
  }
  return null;
}

/**
 * 保存语言到 localStorage
 */
function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem('app-locale', locale);
  } catch (err) {
    console.error('Failed to save locale to localStorage:', err);
  }
}

/**
 * 获取系统默认语言
 */
function getSystemLocale(): Locale {
  const browserLocale = navigator.language?.toLowerCase();

  // 精确匹配
  if (SUPPORTED_LANGUAGES.includes(browserLocale as Locale)) {
    return browserLocale as Locale;
  }

  // 前缀匹配（例如 zh-Hans -> zh-CN）
  if (browserLocale?.startsWith('zh')) {
    return 'zh-CN';
  }
  if (browserLocale?.startsWith('ja')) {
    return 'ja';
  }
  if (browserLocale?.startsWith('en')) {
    return 'en';
  }

  // 默认返回英文
  return DEFAULT_LANGUAGE;
}

/**
 * LocaleProvider 组件
 * 在应用根部包装，提供国际化上下文
 *
 * @example
 * <LocaleProvider>
 *   <App />
 * </LocaleProvider>
 */
export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  // 初始化语言优先级：
  // 1. 明确指定的 initialLocale
  // 2. localStorage 中保存的语言
  // 3. 系统语言
  // 4. 默认语言（英文）
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale && SUPPORTED_LANGUAGES.includes(initialLocale)) {
      return initialLocale;
    }

    const savedLocale = getSavedLocale();
    if (savedLocale) {
      return savedLocale;
    }

    return getSystemLocale();
  });

  // 当语言改变时，持久化到 localStorage
  const setLocale = useCallback((newLocale: Locale) => {
    if (SUPPORTED_LANGUAGES.includes(newLocale)) {
      setLocaleState(newLocale);
      saveLocale(newLocale);
    } else {
      console.error(`Invalid locale: ${newLocale}`);
    }
  }, []);

  // 获取翻译文本
  const t = useCallback(
    (key: string): string => {
      return getTranslation(key, locale);
    },
    [locale]
  );

  // 获取并格式化翻译文本
  const tf = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const text = getTranslation(key, locale);
      return formatTranslation(text, params);
    },
    [locale]
  );

  // 使用 useMemo 避免不必要的重新渲染
  const value = useMemo<LocaleContextType>(
    () => ({
      locale,
      setLocale,
      t,
      tf,
    }),
    [locale, setLocale, t, tf]
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export type { LocaleContextType };
