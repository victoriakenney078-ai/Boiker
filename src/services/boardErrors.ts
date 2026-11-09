import type { PostgrestError } from '@supabase/supabase-js';
import type { Translate } from '../i18n';

function asMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '';
}

export function boardErrorText(error: unknown, t: Translate): string {
  const message = asMessage(error).toLowerCase();
  if (
    message.includes('нет сессии') ||
    message.includes('session') ||
    message.includes('jwt') ||
    message.includes('not authenticated')
  ) {
    return t('boards.errorSession');
  }
  const pg = error as PostgrestError | undefined;
  if (pg && typeof pg.code === 'string' && pg.code === 'PGRST301') {
    return t('boards.errorSession');
  }
  return t('boards.errorGeneric');
}
