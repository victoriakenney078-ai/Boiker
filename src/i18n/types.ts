import type { ru } from './ru';

type DeepString<T> = T extends string
  ? string
  : { [K in keyof T]: DeepString<T[K]> };

export type Messages = DeepString<typeof ru>;

export type Locale = 'ru' | 'en' | 'he';

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

export type MessageKey<T = typeof ru, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? Join<P, K> : MessageKey<T[K], Join<P, K>>;
}[keyof T & string];

export type TranslateVars = Record<string, string | number>;

export type Translate = (key: MessageKey, vars?: TranslateVars) => string;
