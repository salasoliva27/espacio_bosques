import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getLang, setLang, type Lang } from '../lib/i18n';

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
