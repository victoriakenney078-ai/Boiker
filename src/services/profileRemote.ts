import type { ItRole } from '../lib/itRoles';
import { isItRole } from '../lib/itRoles';
import { supabase } from './supabase';

export const PROFILE_ROLE_EVENT = 'aivibeboard:profile-role';

export function notifyProfileRoleChanged(): void {
  window.dispatchEvent(new Event(PROFILE_ROLE_EVENT));
}

export async function saveProfileRole(userId: string, role: ItRole): Promise<boolean> {
  const { error } = await supabase.from('profiles').upsert(
    { id: userId, role },
    { onConflict: 'id' },
  );
  return !error;
}

export async function fetchMyRole(): Promise<ItRole | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const role = typeof data?.role === 'string' ? data.role : '';
  if (error || !isItRole(role)) return null;
  return role;
}
