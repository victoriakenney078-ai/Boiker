import type { TelegramInbound, TelegramWebhookPayload } from '../types';
import { tStatic } from '../i18n';
import { getSettings, getTelegramInbox, putTelegramInbound } from './storage';

function uid(): string {
  return crypto.randomUUID();
}

export type { TelegramWebhookPayload };

export async function ingestTelegramMessage(
  payload: TelegramWebhookPayload,
): Promise<TelegramInbound | { error: string }> {
  const settings = await getSettings();
  const secret = settings.telegramWebhookSecret?.trim();
  if (secret && payload.secret !== secret) {
    return { error: tStatic('telegram.errorSecret') };
  }

  const item: TelegramInbound = {
    id: uid(),
    chatId: payload.chatId,
    fromUsername: payload.fromUsername,
    text: payload.text,
    receivedAt: new Date().toISOString(),
    processed: false,
    linkedTaskId: null,
  };

  await putTelegramInbound(item);
  return item;
}

const DEMO_MESSAGES = [
  'Срочно: обновить документацию API',
  'Можно ли перенести релиз на следующую неделю?',
  'Добавить уведомление при назначении задачи',
  'Проверить мобильную вёрстку sidebar',
];

export async function simulateTelegramMessage(): Promise<TelegramInbound> {
  const settings = await getSettings();
  const text = DEMO_MESSAGES[Math.floor(Math.random() * DEMO_MESSAGES.length)]!;
  const result = await ingestTelegramMessage({
    secret: settings.telegramWebhookSecret?.trim() ?? '',
    chatId: `-100${Math.floor(Math.random() * 1_000_000)}`,
    fromUsername: `user_${Math.floor(Math.random() * 100)}`,
    text,
  });
  if ('error' in result) {
    throw new Error(result.error);
  }
  return result;
}

export async function loadTelegramInbox(): Promise<TelegramInbound[]> {
  return getTelegramInbox();
}

export async function updateTelegramItem(item: TelegramInbound): Promise<void> {
  await putTelegramInbound(item);
}
