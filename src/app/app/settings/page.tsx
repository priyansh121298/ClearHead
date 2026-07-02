import { getUserPrefs } from './actions';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const initialPrefs = await getUserPrefs();

  return (
    <div className="flex flex-col p-6 sm:p-12">
      <div className="w-full max-w-2xl mx-auto mt-4">
        <SettingsClient initialPrefs={initialPrefs} />
      </div>
    </div>
  );
}
