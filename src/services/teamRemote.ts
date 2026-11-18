import type { User } from '../types';
import { supabase } from './supabase';

export async function syncTeamMembers(users: User[]): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const ownerId = sessionData.session?.user.id;
  if (!ownerId) return;

  if (users.length > 0) {
    const { error } = await supabase.from('team_members').upsert(
      users.map((user) => ({
        id: user.id,
        owner_id: ownerId,
        name: user.name,
        role: user.role ?? null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'owner_id,id' },
    );
    if (error) throw error;
  }

  const { data: existing, error: listError } = await supabase
    .from('team_members')
    .select('id')
    .eq('owner_id', ownerId);
  if (listError) throw listError;

  const keep = new Set(users.map((user) => user.id));
  const stale = (existing ?? []).map((row) => row.id as string).filter((id) => !keep.has(id));
  if (stale.length === 0) return;

  const { error: deleteError } = await supabase.from('team_members').delete().in('id', stale);
  if (deleteError) throw deleteError;
}
