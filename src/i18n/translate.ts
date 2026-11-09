import type { Locale, MessageKey, Messages, TranslateVars } from './types';
import { ru } from './ru';
import { en } from './en';
import { he } from './he';

export const dictionaries: Record<Locale, Messages> = { ru, en, he };

export const DATE_LOCALES: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  he: 'he-IL',
};

export const HTML_LANG: Record<Locale, string> = {
  ru: 'ru',
  en: 'en',
  he: 'he',
};

export const STORAGE_KEY = 'aivibeboard.locale';

let activeLocale: Locale = 'ru';

export function isLocale(value: string | null): value is Locale {
  return value === 'ru' || value === 'en' || value === 'he';
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

function lookup(messages: Messages, key: MessageKey): string {
  const parts = key.split('.');
  let current: unknown = messages;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}

export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] === undefined ? `{${name}}` : String(vars[name]),
  );
}

export function translate(locale: Locale, key: MessageKey, vars?: TranslateVars): string {
  return interpolate(lookup(dictionaries[locale], key), vars);
}

export function tStatic(key: MessageKey, vars?: TranslateVars): string {
  return translate(activeLocale, key, vars);
}

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr';
}

export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'ru';
}
