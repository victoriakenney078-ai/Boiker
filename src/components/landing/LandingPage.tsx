import { useI18n } from '../../i18n';
import { LanguageSwitcher } from '../LanguageSwitcher';
import styles from './LandingPage.module.css';

interface Props {
  signedIn: boolean;
  onOpenAuth: () => void;
  onOpenApp: () => void;
}

export function LandingPage({ signedIn, onOpenAuth, onOpenApp }: Props) {
  const { t } = useI18n();
  const open = signedIn ? onOpenApp : onOpenAuth;
  const cta = signedIn ? t('landing.ctaOpenBoard') : t('landing.ctaLogin');

  const features = [
    {
      title: t('landing.featureKanbanTitle'),
      text: t('landing.featureKanbanText'),
      icon: '▦',
    },
    {
      title: t('landing.featureAiTitle'),
      text: t('landing.featureAiText'),
      icon: '✦',
    },
    {
      title: t('landing.featureTelegramTitle'),
      text: t('landing.featureTelegramText'),
      icon: '✉',
    },
    {
      title: t('landing.featureKnowledgeTitle'),
      text: t('landing.featureKnowledgeText'),
      icon: '◫',
    },
  ];

  const steps = [
    {
      n: '01',
      title: t('landing.step1Title'),
      text: t('landing.step1Text'),
    },
    {
      n: '02',
      title: t('landing.step2Title'),
      text: t('landing.step2Text'),
    },
    {
      n: '03',
      title: t('landing.step3Title'),
      text: t('landing.step3Text'),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.yellowStripe} aria-hidden />
      <header className={styles.nav}>
        <a href="#top" className={styles.navLogo}>
          AivibeBoard
        </a>
        <nav className={styles.navLinks} aria-label={t('landing.navAria')}>
          <a href="#features">{t('landing.navFeatures')}</a>
          <a href="#how">{t('landing.navHow')}</a>
          <a href="#start">{t('landing.navStart')}</a>
        </nav>
        <div className={styles.navEnd}>
          <LanguageSwitcher variant="landing" />
          <button type="button" className={styles.navCta} onClick={open}>
            {cta}
          </button>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>{t('landing.eyebrow')}</p>
            <h1 className={styles.heroTitle}>{t('landing.heroTitle')}</h1>
            <p className={styles.heroLead}>{t('landing.heroLead')}</p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.btnPrimary} onClick={open}>
                {signedIn ? t('landing.ctaOpenBoard') : t('landing.ctaTry')}
              </button>
              <a href="#features" className={styles.btnGhost}>
                {t('landing.ctaSeeFeatures')}
              </a>
            </div>
            <ul className={styles.heroStats}>
              <li>
                <strong>IndexedDB</strong>
                <span>{t('landing.statIndexed')}</span>
              </li>
              <li>
                <strong>{t('landing.statNoServerTitle')}</strong>
                <span>{t('landing.statNoServer')}</span>
              </li>
              <li>
                <strong>{t('landing.statLangTitle')}</strong>
                <span>{t('landing.statLang')}</span>
              </li>
            </ul>
          </div>
          <figure className={styles.heroArt}>
            <div className={styles.artFrame}>
              <img
                src="/landing-art.jpg"
                alt={t('landing.artAlt')}
                width={480}
                height={640}
                loading="eager"
              />
            </div>
            <figcaption className={styles.artCaption}>{t('landing.artCaption')}</figcaption>
          </figure>
        </section>

        <section id="features" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>{t('landing.featuresHead')}</h2>
            <p>{t('landing.featuresLead')}</p>
          </div>
          <ul className={styles.featureGrid}>
            {features.map((f) => (
              <li key={f.title} className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden>
                  {f.icon}
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="how" className={`${styles.section} ${styles.sectionMuted}`}>
          <div className={styles.sectionHead}>
            <h2>{t('landing.howHead')}</h2>
            <p>{t('landing.howLead')}</p>
          </div>
          <ol className={styles.steps}>
            {steps.map((s) => (
              <li key={s.n} className={styles.step}>
                <span className={styles.stepNum}>{s.n}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="start" className={styles.ctaBand}>
          <div className={styles.ctaInner}>
            <h2>{t('landing.startHead')}</h2>
            <p>{t('landing.startLead')}</p>
            <button type="button" className={styles.btnPrimary} onClick={open}>
              {signedIn ? t('landing.ctaOpenBoard') : t('landing.ctaLaunch')}
            </button>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>AivibeBoard</span>
        <p>{t('landing.footerNote')}</p>
      </footer>
    </div>
  );
}
