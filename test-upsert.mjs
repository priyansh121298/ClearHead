import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError || !users?.users.length) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  const user = users.users[0];
  console.log('Testing with user:', user.id);

  const { error } = await supabase
    .from('user_prefs')
    .upsert({
      user_id: user.id,
      username: 'test_username_123',
      morning_card_time: '08:00',
      timezone: 'America/Los_Angeles',
      morning_card_enabled: false,
      weekly_report_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }); 
    
  if (error) {
    console.log('Full JSON error output:');
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log('Success!');
  }
}

test();
