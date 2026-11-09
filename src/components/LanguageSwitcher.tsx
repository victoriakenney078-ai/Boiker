import type { Locale, MessageKey } from '../i18n';
import { useI18n } from '../i18n';
import styles from './LanguageSwitcher.module.css';

const OPTIONS: { code: Locale; key: MessageKey }[] = [
  { code: 'ru', key: 'lang.ru' },
  { code: 'en', key: 'lang.en' },
  { code: 'he', key: 'lang.he' },
];

interface Props {
  variant?: 'landing' | 'app';
}

export function LanguageSwitcher({ variant = 'app' }: Props) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={`${styles.switcher} ${variant === 'landing' ? styles.landing : styles.app}`}
      role="group"
      aria-label={t('lang.aria')}
      dir="ltr"
    >
      {OPTIONS.map(({ code, key }) => (
        <button
          key={code}
          type="button"
          className={locale === code ? styles.active : styles.option}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {t(key)}
        </button>
      ))}
    </div>
  );
}
