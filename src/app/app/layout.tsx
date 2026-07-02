import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayoutClient from './AppLayoutClient';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <AppLayoutClient userEmail={user.email || ''}>
      {children}
    </AppLayoutClient>
  );
}
