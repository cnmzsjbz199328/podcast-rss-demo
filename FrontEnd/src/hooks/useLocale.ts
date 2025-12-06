import { useContext } from 'react';
import { LocaleContext, type LocaleContextType } from '@/contexts/LocaleContext';

/**
 * useLocale Hook
 * 获取国际化上下文，用于在组件中访问翻译函数
 *
 * @returns LocaleContext 的值，包含 locale、setLocale、t 和 tf 函数
 *
 * @throws 如果在 LocaleProvider 外部使用，会抛出错误
 *
 * @example
 * function MyComponent() {
 *   const { t, locale, setLocale } = useLocale();
 *   return (
 *     <div>
 *       <p>{t('home.searchPlaceholder')}</p>
 *       <p>Current language: {locale}</p>
 *       <button onClick={() => setLocale('zh-CN')}>切换中文</button>
 *     </div>
 *   );
 * }
 */
export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error(
      'useLocale must be used within a LocaleProvider. ' +
      'Make sure LocaleProvider wraps your component tree.'
    );
  }

  return context;
}
