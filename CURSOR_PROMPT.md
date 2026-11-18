# Промпт для Cursor: AivibeBoard

Ниже — исходная спецификация MVP. Текущее приложение её расширило: лендинг, вход и регистрация по email через Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), обязательная роль IT-команды в `profiles` (регистрация, настройки, подпись в шапке), интерфейс на русском, английском и иврите (`src/i18n/`), страница **«Мои доски»** и несколько канбанов на аккаунт. **Доски, колонки, задачи и роль аккаунта** — в Supabase (`src/services/boardRemote.ts`, `src/services/profileRemote.ts`, миграции в `supabase/migrations/`). **База знаний, inbox Telegram и прочие настройки** — в IndexedDB. Копия команды (`team_members`, с ролью) уходит в Supabase при загрузке приложения: бот `@xccxg_FJ_Bot` по кнопке «Мои доски» принимает крупную задачу и создаёт эпик с подзадачами в «Бэклоге». На карточке задачи можно назначить участника доски и удалить её. Сессия — `useAppSession`, список и канбан — `BoardsPage` / `AppShell`. Актуальный запуск, схема БД, Auth, языки и структура — в [README.md](./README.md).

Скопируй **весь блок ниже** (от линии «НАЧАЛО ПРОМПТА» до «КОНЕЦ ПРОМПТА») в новый чат Cursor в режиме **Agent** в пустой или новой папке проекта.

---

## НАЧАЛО ПРОМПТА

Ты — senior fullstack-разработчик. С нуля собери **одностраничное веб-приложение AivibeBoard** — аналог Trello / лёгкой Jira с дополнениями: постановка задач через ИИ, приём задач из Telegram, база знаний по проекту.

### Жёсткие ограничения

1. **Стек:** Vite + React 18 + TypeScript. Без Next.js и без отдельного бэкенда в первой версии.
2. **Один экран:** без React Router. Навигация — боковая панель / вкладки / модалки на той же странице.
3. **Данные:** персистентность в браузере — **IndexedDB** (предпочтительно через `idb` или аналог). Допустим fallback на `localStorage` только для настроек.
4. **Язык UI:** русский (подписи, ошибки, плейсхолдеры).
5. **Секреты:** API-ключи ИИ и Telegram **не** коммитить. Только `.env.example` и чтение через `import.meta.env`.
6. **Объём:** сфокусированный MVP, без микросервисов. Telegram-бот — **контракт + mock + точка расширения**; отдельный Node-скрипт для бота — опционально в `scripts/`, не обязателен для запуска SPA.

---

### Продукт

**AivibeBoard** — доска проекта с колонками (канбан), карточками задач, командой, ИИ-разбиением эпиков на подзадачи с назначением исполнителей, очередью входящих из Telegram и базой знаний (документы проекта как контекст для ИИ).

**Брендинг UI:** в шапке приложения всегда отображай логотип/название **AivibeBoard** (рядом или под ним — редактируемое имя проекта из настроек, по умолчанию «Демо»). Title страницы (`index.html`): `AivibeBoard`.

### Не делать в v1 (out of scope)

Не добавляй в первую версию, даже если «логично дорастить»:

- Аутентификация, роли, multi-tenant, несколько проектов на одном инстансе.
- Real-time коллаборация (WebSocket, CRDT, совместное редактирование).
- Полноценный RAG: embeddings, векторная БД, семантический поиск по базе знаний (достаточно выбранных фрагментов текста в prompt ИИ).
- Production-бэкенд, SSR, микросервисы; отдельный деплой API — только roadmap в README.
- Мобильное нативное приложение; достаточно адаптивной вёрстки desktop-first.

---

### Модель данных (TypeScript)

Опиши типы в `src/types/` и используй их везде.

```ts
// Участник команды
interface User {
  id: string;
  name: string;
  avatarColor?: string;
  telegramUsername?: string;
}

// Колонка канбана
interface Column {
  id: string;
  title: string;
  order: number;
}

// Приоритет и источник задачи
type Priority = 'low' | 'medium' | 'high' | 'critical';
type TaskSource = 'manual' | 'ai' | 'telegram';

interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  priority: Priority;
  labels: string[];
  subtasks: { id: string; title: string; done: boolean }[];
  parentTaskId: string | null; // если создана как подзадача эпика
  source: TaskSource;
  createdAt: string; // ISO
  updatedAt: string;
}

// Эпик / запрос на разбиение ИИ (можно хранить как черновик до подтверждения)
interface AiDecompositionDraft {
  id: string;
  epicTitle: string;
  epicDescription: string;
  suggestedTasks: {
    title: string;
    description: string;
    suggestedAssigneeId: string | null;
    priority: Priority;
  }[];
  knowledgeDocIds: string[];
  createdAt: string;
}

// Документ базы знаний
interface KnowledgeDoc {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  excerpt: string; // первые ~500 символов для превью
  // полный текст — отдельно в IndexedDB (blob или text store)
}

// Входящее из Telegram (очередь до превращения в Task)
interface TelegramInbound {
  id: string;
  chatId: string;
  fromUsername: string | null;
  text: string;
  receivedAt: string;
  processed: boolean;
  linkedTaskId: string | null;
}

interface ProjectSettings {
  projectName: string;
  openAiApiKeyConfigured: boolean; // флаг, ключ только в env
  telegramWebhookSecret?: string;
}
```

Начальные данные: 1 проект «Демо», 3–4 пользователя, колонки «Бэклог», «В работе», «На проверке», «Готово», несколько демо-карточек.

---

### Архитектура папок

```
src/
  components/     # UI: Board, Column, TaskCard, TaskModal, Sidebar, KnowledgePanel, AiPanel, TelegramInbox
  hooks/          # useBoard, useKnowledge, useAiDecompose
  services/
    storage.ts    # IndexedDB CRUD
    ai.ts         # разбиение задач (OpenAI + fallback)
    telegram.ts   # mock inbound + ingest API shape
    knowledge.ts  # upload, extract text (md/txt; pdf — попытка через текст или предупреждение)
  types/
  App.tsx
  main.tsx
.env.example
README.md         # как запустить, env, как подключить Telegram позже
```

Стили: **CSS Modules** или **Tailwind** — на твой выбор, но единообразно. Современный UI: светлая тема, акцентный цвет, drag-and-drop карточек между колонками (`@dnd-kit/core` или HTML5 DnD).

---

### Экран (layout)

Один `App` с layout:

| Зона | Содержимое |
|------|------------|
| **Header** | **AivibeBoard** + имя проекта, поиск по задачам, кнопка «+ Задача» |
| **Sidebar** | Переключатель: **Доска** \| **База знаний** \| **ИИ-постановка** \| **Telegram** \| **Команда** \| **Настройки** |
| **Main** | Контент выбранного раздела |

#### Доска

- Горизонтальный скролл колонок.
- Drag-and-drop карточек между колонками и reorder внутри колонки.
- Клик по карточке → модалка: title, description, assignee, priority, labels, checklist подзадач, источник (manual/ai/telegram).
- Добавление/переименование/удаление колонки (с подтверждением если есть задачи).

#### Команда

- CRUD пользователей (имя, цвет аватара, optional `@telegram`).
- Список используется в select «Исполнитель» и при назначении ИИ.

#### База знаний

- Drag-and-drop или input загрузки: `.md`, `.txt`, `.pdf` (для pdf — если полный парсинг тяжёлый, сохрани файл и покажи предупреждение «полный текст PDF ограничен», но сохрани имя и метаданные).
- Таблица/список документов: имя, дата, размер, удаление.
- Просмотр текста документа в модалке или split-pane.
- Чекбоксы «использовать в контексте ИИ» (мультивыбор документов).

#### ИИ-постановка

Форма:

- **Название эпика** (кратко)
- **Описание** (большая задача, контекст, дедлайны — свободный текст)
- **Выбор документов** из базы знаний (optional)
- Кнопка **«Разбить на задачи»**

Поведение `services/ai.ts`:

1. Для вошедшего пользователя — `supabase.functions.invoke('openrouter')` (Edge Function, модель OpenRouter `openai/gpt-6-luna`, ключ на стороне Supabase, не в SPA). System prompt: PM, 3–12 задач, JSON `{ tasks: [{ title, description, priority, assigneeName }] }`, имена из списка команды.
2. Если функция или парсинг JSON недоступны — **локальный fallback**: эвристика по строкам; назначение по ключевым словам роли участника или round-robin.

**Чат постановки на доске** (`BoardChat` в `AppShell`, только при открытой доске и разделе «Доска»): пользователь пишет одну крупную задачу → `decomposeGlobalTask` передаёт в модель участников с полями `name` и `role` (`ItRole`) → без превью сразу `createEpicOnBoard` в «Бэклог»; в чате краткий отчёт «сколько задач и кому».

После генерации в панели «ИИ-постановка» — превью таблицы предложенных задач с возможностью править title/description/assignee/priority **до** кнопки **«Создать на доске»**:

1. Сначала создай **одну родительскую карточку-эпик** в «Бэклог» (title = название эпика, description = описание, `source: 'ai'`, метка/label «Эпик»).
2. Затем создай дочерние задачи в «Бэклог» с `source: 'ai'` и `parentTaskId` = id эпика.
3. В модалке дочерней задачи показывай ссылку/подсказку на родительский эпик (если есть `parentTaskId`).

Показывай индикатор загрузки и понятные ошибки на русском.

#### Telegram

- **Inbox:** список `TelegramInbound` (mock-данные при первом запуске + кнопка «Симулировать сообщение» для демо).
- Действия: «Создать задачу» (prefill title/description из текста, `source: 'telegram'`), «Отметить обработанным», привязка к существующей задаче.
- Экспортируй функцию и тип для будущего webhook:

```ts
// POST body shape (документировать в README)
interface TelegramWebhookPayload {
  secret: string;
  chatId: string;
  fromUsername: string | null;
  text: string;
}
```

`ingestTelegramMessage(payload)` → сохраняет в IndexedDB, UI обновляется.

Опционально: минимальный `scripts/telegram-bot.mjs` (telegraf или fetch long polling) **только как пример**, читает `TELEGRAM_BOT_TOKEN`, шлёт POST на локальный proxy — **не блокируй MVP**, если нет времени.

#### Настройки

- Роль аккаунта (Supabase `profiles`).
- Имя проекта.
- Подсказка: ИИ идёт через Edge Function OpenRouter на сервере.
- Telegram secret для webhook (хранить в settings store).

#### Лендинг

- Маркетинговые секции + **LandingChat** (история в `sessionStorage`, OpenRouter, вход обязателен для отправки).

---

### OpenAI system prompt (ориентир)

Сохрани константу в `ai.ts` (на русском или английском, но JSON-поля как в типах):

- Вход: epicTitle, epicDescription, users[], knowledgeChunks[] (склеенные фрагменты выбранных документов, обрезка ~8k символов суммарно).
- Выход: JSON `{ "tasks": [ { "title", "description", "priority", "assigneeName" } ] }` — затем маппинг `assigneeName` → `user.id`.

---

### Качество и DX

- `npm run dev`, `npm run build`, `npm run preview` без ошибок TypeScript.
- ESLint по умолчанию от Vite — без сотен warning.
- README на русском: установка, env, описание разделов, roadmap (реальный Telegram webhook, RAG/embeddings для базы знаний).
- `.env.example`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- Edge Function `supabase/functions/openrouter`, миграция RPC для Vault (см. README).

---

### Критерии готовности (acceptance)

- [ ] Доска с DnD, CRUD задач и колонок, данные переживают перезагрузку страницы.
- [ ] Команда: минимум 2 пользователя, назначение на карточку.
- [ ] База знаний: загрузка md/txt, список, просмотр, выбор для ИИ.
- [ ] ИИ-постановка: fallback без сервера; с OpenRouter — Edge Function; после подтверждения — эпик + дочерние задачи в «Бэклог» с `parentTaskId`. Чат на доске создаёт те же карточки без превью.
- [ ] В header видно **AivibeBoard** и имя проекта; title вкладки — AivibeBoard.
- [ ] Telegram inbox: mock + симуляция + создание задачи из сообщения.
- [ ] UI на русском, аккуратный современный вид.
- [ ] Нет захардкоженных секретов в репозитории.

---

### Порядок реализации

1. Scaffold Vite React TS + типы + storage + seed data.
2. Доска + модалка задачи + команда.
3. База знаний + хранение текста.
4. ИИ-сервис + панель + создание задач.
5. Telegram inbox + ingest.
6. Полировка UI, README, `.env.example`.

Не спрашивай лишних уточнений — принимай разумные решения по UX и библиотекам. Если выбор библиотеки не критичен, предпочитай популярные и лёгкие зависимости.

## КОНЕЦ ПРОМПТА

---

## Как использовать

1. Создай папку проекта (или открой пустую).
2. В Cursor: **New Agent Chat** → вставь блок между «НАЧАЛО ПРОМПТА» и «КОНЕЦ ПРОМПТА».
3. Дождись генерации, затем `npm install` и `npm run dev`.
4. Для ИИ задеплойте Edge Function `openrouter` и положите ключ OpenRouter в секрет проекта Supabase (см. README).
