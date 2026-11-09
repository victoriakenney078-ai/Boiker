import styles from './LandingPage.module.css';

interface Props {
  signedIn: boolean;
  onOpenAuth: () => void;
  onOpenApp: () => void;
}

const features = [
  {
    title: 'Канбан-доска',
    text: 'Колонки, карточки, приоритеты и подзадачи — как в Trello или Jira, но без лишней сложности.',
    icon: '▦',
  },
  {
    title: 'ИИ-разбиение эпиков',
    text: 'Опишите большую задачу — ассистент предложит подзадачи и назначит исполнителей из команды.',
    icon: '✦',
  },
  {
    title: 'Telegram-inbox',
    text: 'Заявки из чата попадают в очередь на доске: обработайте и превратите в карточки одним кликом.',
    icon: '✉',
  },
  {
    title: 'База знаний',
    text: 'Загружайте md и txt по проекту — выбранные документы подмешиваются в контекст для ИИ.',
    icon: '◫',
  },
];

const steps = [
  {
    n: '01',
    title: 'Соберите контекст',
    text: 'Добавьте участников, документы и настройте колонки под ваш процесс.',
  },
  {
    n: '02',
    title: 'Поставьте эпик',
    text: 'Введите описание крупной задачи или примите запрос из Telegram.',
  },
  {
    n: '03',
    title: 'Подтвердите разбиение',
    text: 'Проверьте черновик ИИ и отправьте подзадачи на доску с назначениями.',
  },
];

export function LandingPage({ signedIn, onOpenAuth, onOpenApp }: Props) {
  const open = signedIn ? onOpenApp : onOpenAuth;
  const cta = signedIn ? 'Открыть доску' : 'Войти';

  return (
    <div className={styles.page}>
      <div className={styles.yellowStripe} aria-hidden />
      <header className={styles.nav}>
        <a href="#top" className={styles.navLogo}>
          AivibeBoard
        </a>
        <nav className={styles.navLinks} aria-label="Разделы">
          <a href="#features">Возможности</a>
          <a href="#how">Как работает</a>
          <a href="#start">Старт</a>
        </nav>
        <button type="button" className={styles.navCta} onClick={open}>
          {cta}
        </button>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Управление проектом · React + TypeScript</p>
            <h1 className={styles.heroTitle}>
              Доска задач с&nbsp;ИИ, Telegram и&nbsp;базой знаний
            </h1>
            <p className={styles.heroLead}>
              AivibeBoard — лёгкий аналог Trello для команды: разбивайте эпики через
              ассистента, принимайте задачи из мессенджера и храните документы проекта
              рядом с канбаном. Данные остаются в вашем браузере.
            </p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.btnPrimary} onClick={open}>
                {signedIn ? 'Открыть доску' : 'Попробовать бесплатно'}
              </button>
              <a href="#features" className={styles.btnGhost}>
                Смотреть возможности
              </a>
            </div>
            <ul className={styles.heroStats}>
              <li>
                <strong>IndexedDB</strong>
                <span>локальное хранение</span>
              </li>
              <li>
                <strong>Без сервера</strong>
                <span>MVP в браузере</span>
              </li>
              <li>
                <strong>RU</strong>
                <span>интерфейс на русском</span>
              </li>
            </ul>
          </div>
          <figure className={styles.heroArt}>
            <div className={styles.artFrame}>
              <img
                src="/landing-art.jpg"
                alt="Иллюстрация: уютное розовое пространство и чтение — настроение AivibeBoard"
                width={480}
                height={640}
                loading="eager"
              />
            </div>
            <figcaption className={styles.artCaption}>Ваш проект — в тёплом ритме</figcaption>
          </figure>
        </section>

        <section id="features" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Всё для потока задач в одном месте</h2>
            <p>
              Не отдельные сервисы для доски, чат-бота и wiki — единая рабочая
              поверхность для небольшой команды.
            </p>
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
            <h2>Как это работает</h2>
            <p>От идеи до карточек на доске — три шага после входа.</p>
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
            <h2>Готовы собрать первый спринт?</h2>
            <p>
              Демо открывается в этой же вкладке: канбан, inbox Telegram, панель ИИ и
              база знаний уже наполнены примерами.
            </p>
            <button type="button" className={styles.btnPrimary} onClick={open}>
              {signedIn ? 'Открыть доску' : 'Запустить AivibeBoard'}
            </button>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>AivibeBoard</span>
        <p>Одностраничное приложение · Vite · React · TypeScript</p>
      </footer>
    </div>
  );
}
