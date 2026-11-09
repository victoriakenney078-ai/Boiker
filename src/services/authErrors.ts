import type { AuthError } from '@supabase/supabase-js';
import type { Translate } from '../i18n';

export function authErrorText(error: AuthError, t: Translate): string {
  const message = error.message.toLowerCase();
  if (error.status === 429 || message.includes('rate limit')) {
    return t('auth.errorRateLimit');
  }
  if (message.includes('invalid login credentials')) {
    return t('auth.errorInvalidCredentials');
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return t('auth.errorAlreadyRegistered');
  }
  if (message.includes('at least 6')) {
    return t('auth.passwordMin');
  }
  if (message.includes('invalid') && message.includes('email')) {
    return t('auth.errorInvalidEmail');
  }
  if (message.includes('email not confirmed')) {
    return t('auth.errorEmailNotConfirmed');
  }
  if (message.includes('signup') && message.includes('disabled')) {
    return t('auth.errorSignupDisabled');
  }
  return t('auth.errorGeneric');
}
