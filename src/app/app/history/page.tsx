import { getHistory } from './actions';
import HistoryClient from './HistoryClient';

export default async function HistoryPage() {
  const initialData = await getHistory(0, 50, 'ALL');

  return (
    <div className="flex flex-col p-6 sm:p-12">
      <div className="w-full max-w-3xl mx-auto mt-4">
        <HistoryClient initialData={initialData} />
      </div>
    </div>
  );
}
