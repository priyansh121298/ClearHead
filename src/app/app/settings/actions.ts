'use server';
import { createClient } from '@/lib/supabase/server';

export type UserPrefs = {
  morning_card_time: string;
  timezone: string;
  morning_card_enabled: boolean;
};

export async function getUserPrefs(): Promise<UserPrefs> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from('user_prefs')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 means no rows returned, which is fine for new users
    console.error('Error fetching prefs:', error);
  }

  return {
    morning_card_time: data?.morning_card_time || '08:00',
    timezone: data?.timezone || 'Asia/Kolkata',
    morning_card_enabled: data?.morning_card_enabled ?? false,
  };
}

export async function saveUserPrefs(prefs: UserPrefs) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from('user_prefs')
    .upsert({
      user_id: user.id,
      morning_card_time: prefs.morning_card_time,
      timezone: prefs.timezone,
      morning_card_enabled: prefs.morning_card_enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }); 

  if (error) {
    console.error('Error saving prefs:', error);
    throw new Error('Failed to save preferences');
  }

  return { success: true };
}
