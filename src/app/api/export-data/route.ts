import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch dumps
  const { data: dumps } = await supabase
    .from('dumps')
    .select('*')
    .eq('user_id', user.id);

  // Fetch dump items
  const { data: dumpItems } = await supabase
    .from('dump_items')
    .select('*')
    .eq('user_id', user.id);

  // Fetch user prefs
  const { data: userPrefs } = await supabase
    .from('user_prefs')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const exportData = {
    user: {
      email: user.email,
      created_at: user.created_at,
    },
    preferences: userPrefs,
    dumps: dumps || [],
    dump_items: dumpItems || [],
    export_date: new Date().toISOString()
  };

  const filename = `clearhead-export-${new Date().toISOString().split('T')[0]}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
