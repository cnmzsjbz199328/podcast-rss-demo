import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { LANGUAGE_CONFIG, SUPPORTED_LANGUAGES } from '@/locales';
import type { Locale } from '@/locales';

/**
 * 语言选择器组件
 * 显示在页面头部，允许用户切换语言
 * 
 * 功能：
 * - 显示当前语言
 * - 下拉菜单显示所有可用语言
 * - 点击选项切换语言
 * - 支持点击外部关闭下拉菜单
 * 
 * @example
 * <LanguageSwitcher />
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 处理点击外部时关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const currentLang = LANGUAGE_CONFIG[locale];

  const handleSelectLanguage = (lang: Locale) => {
    setLocale(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 语言选择按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label="Language selector"
        title={currentLang.nativeName}
      >
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm font-medium hidden sm:inline">
          {currentLang.nativeName}
        </span>
        <span className="material-symbols-outlined text-sm">
          expand_more
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-slate-800 rounded-lg shadow-lg overflow-hidden z-50 border border-slate-700">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = locale === lang;
            const langConfig = LANGUAGE_CONFIG[lang];

            return (
              <button
                key={lang}
                onClick={() => handleSelectLanguage(lang)}
                className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                  isSelected
                    ? 'bg-primary/20 text-primary'
                    : 'text-white hover:bg-slate-700'
                }`}
              >
                <span className="text-base">{langConfig.flag}</span>
                <span>{langConfig.nativeName}</span>
                {isSelected && (
                  <span className="material-symbols-outlined text-sm ml-auto">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
