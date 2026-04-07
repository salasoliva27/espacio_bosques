import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { getLang, setLang, translate, type Lang, type TranslationKey } from '../lib/i18n';

interface LanguageContextValue {
  lang: Lang;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: getLang(),
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang);

  const toggle = useCallback(() => {
    const next: Lang = lang === 'es' ? 'en' : 'es';
    setLang(next);
    setLangState(next);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Returns a t() function bound to the current language. Use this in all components. */
export function useT() {
  const { lang } = useLanguage();
  return useMemo(
    () => (key: TranslationKey, vars?: Record<string, string>) => translate(key, lang, vars),
    [lang],
  );
}
