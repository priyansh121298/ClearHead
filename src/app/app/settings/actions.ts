'use server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type UserPrefs = {
  username?: string;
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
    username: data?.username || '',
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
      username: prefs.username,
      morning_card_time: prefs.morning_card_time,
      timezone: prefs.timezone,
      morning_card_enabled: prefs.morning_card_enabled,
    }, { onConflict: 'user_id' }); 

  if (error) {
    console.error('Error saving prefs:', error);
    console.error('Full Supabase error object:', JSON.stringify(error, null, 2));
    throw new Error('Failed to save preferences');
  }

  return { success: true };
}

export async function deleteAccount() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(user.id);
  
  if (error) {
    console.error('Failed to delete user:', error);
    throw new Error('Failed to delete account');
  }

  // Optional: We can manually cascade delete if DB isn't configured, but assuming ON DELETE CASCADE is set
  await supabase.auth.signOut();

  return { success: true };
}

export async function changePassword(currentPass: string, newPass: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error("Unauthorized");

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPass,
  });

  if (signInError) {
    return { error: 'Current password is incorrect' };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPass
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true };
}
