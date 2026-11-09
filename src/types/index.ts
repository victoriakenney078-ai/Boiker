export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TaskSource = 'manual' | 'ai' | 'telegram';

export interface User {
  id: string;
  name: string;
  avatarColor?: string;
  telegramUsername?: string;
}

export interface Column {
  id: string;
  title: string;
  order: number;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  priority: Priority;
  labels: string[];
  subtasks: Subtask[];
  parentTaskId: string | null;
  source: TaskSource;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestedTask {
  title: string;
  description: string;
  suggestedAssigneeId: string | null;
  priority: Priority;
}

export interface AiDecompositionDraft {
  id: string;
  epicTitle: string;
  epicDescription: string;
  suggestedTasks: SuggestedTask[];
  knowledgeDocIds: string[];
  createdAt: string;
}

export interface KnowledgeDoc {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  excerpt: string;
  textLimited?: boolean;
}

export interface TelegramInbound {
  id: string;
  chatId: string;
  fromUsername: string | null;
  text: string;
  receivedAt: string;
  processed: boolean;
  linkedTaskId: string | null;
}

export interface TelegramWebhookPayload {
  secret: string;
  chatId: string;
  fromUsername: string | null;
  text: string;
}

export interface ProjectSettings {
  projectName: string;
  openAiApiKeyConfigured: boolean;
  telegramWebhookSecret?: string;
}

export type AppSection =
  | 'board'
  | 'knowledge'
  | 'ai'
  | 'telegram'
  | 'team'
  | 'settings';

export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

export const SOURCE_LABELS: Record<TaskSource, string> = {
  manual: 'Вручную',
  ai: 'ИИ',
  telegram: 'Telegram',
};
