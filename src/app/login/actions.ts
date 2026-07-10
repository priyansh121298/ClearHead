'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/app/dump');
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const username = formData.get('username') as string;
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await supabase.from('user_prefs').insert({
      user_id: data.user.id,
      username: username || email.split('@')[0],
      morning_card_time: '08:00',
      timezone: 'America/Los_Angeles',
      morning_card_enabled: false
    });
  }

  if (!data.session) {
    return { message: 'Check your email to confirm your account' };
  }

  redirect('/app/dump');
}
