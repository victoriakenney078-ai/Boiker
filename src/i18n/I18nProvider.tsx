import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale, MessageKey, Translate, TranslateVars } from './types';
import { I18nContext, type I18nContextValue } from './context';
import {
  DATE_LOCALES,
  HTML_LANG,
  STORAGE_KEY,
  dictionaries,
  dirFor,
  readStoredLocale,
  setActiveLocale,
  translate,
} from './translate';

function applyDocumentLocale(locale: Locale): void {
  const dir = dirFor(locale);
  document.documentElement.lang = HTML_LANG[locale];
  document.documentElement.dir = dir;
  document.title = dictionaries[locale].app.documentTitle;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', dictionaries[locale].app.documentDescription);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = readStoredLocale();
    setActiveLocale(initial);
    applyDocumentLocale(initial);
    return initial;
  });

  const dir = dirFor(locale);

  useEffect(() => {
    setActiveLocale(locale);
    applyDocumentLocale(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback<Translate>(
    (key: MessageKey, vars?: TranslateVars) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      dir,
      dateLocale: DATE_LOCALES[locale],
    }),
    [locale, setLocale, t, dir],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
