import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app/dump';

  if (code) {
    const supabase = createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && sessionData?.user) {
      // Create user_prefs fallback for OAuth signups
      const { data: prefs } = await supabase.from('user_prefs')
        .select('user_id')
        .eq('user_id', sessionData.user.id)
        .single();
        
      if (!prefs) {
        const email = sessionData.user.email || '';
        const username = email.split('@')[0] || 'user';
        await supabase.from('user_prefs').insert({
          user_id: sessionData.user.id,
          username: username,
          morning_card_time: '08:00',
          timezone: 'America/Los_Angeles',
          morning_card_enabled: false
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
