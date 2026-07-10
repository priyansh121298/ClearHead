import { getUserPrefs } from './actions';
import SettingsClient from './SettingsClient';
import { createClient } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initialPrefs = await getUserPrefs();

  const email = user?.email || 'Unknown';
  const provider = user?.app_metadata?.providers?.[0] || 'email';

  return (
    <div className="flex flex-col p-6 sm:p-12">
      <div className="w-full max-w-2xl mx-auto mt-4">
        <SettingsClient initialPrefs={initialPrefs} email={email} provider={provider} />
      </div>
    </div>
  );
}
