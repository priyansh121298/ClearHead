import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  // We can query the first row and see what keys it has, or use Postgres metadata.
  const { data, error } = await supabase.from('user_prefs').select('*').limit(1);
  if (error) {
    console.log('Error fetching user_prefs:', error);
  } else {
    console.log('Columns found in user_prefs:');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('No rows in user_prefs. Cannot infer columns without direct SQL.');
      
      // Let's try to upsert with just user_id to see what gets returned.
      const { data: users } = await supabase.auth.admin.listUsers();
      if (users && users.users.length > 0) {
         const uid = users.users[0].id;
         const { data: upsertData, error: upsertErr } = await supabase
           .from('user_prefs')
           .upsert({ user_id: uid }, { onConflict: 'user_id' })
           .select();
         if (upsertErr) console.log('Upsert fallback error:', upsertErr);
         else if (upsertData && upsertData.length > 0) {
           console.log('Columns after fallback upsert:', Object.keys(upsertData[0]));
         }
      }
    }
  }
}

checkColumns();
