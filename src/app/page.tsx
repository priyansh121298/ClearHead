import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ClearHead | Dump your thoughts in 60 seconds',
  description: 'ClearHead organises your unstructured thoughts into tasks, ideas, worries and reminders — so you don\'t have to. Calm, minimal, and secure.',
};

export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/app/dump');
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div className="max-w-2xl text-center space-y-12 relative z-10">
        <div className="space-y-6 animate-fade-in-up">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Your brain is full. <br className="hidden sm:block" />
            <span className="text-[#7B6EF6]">Let's sort it.</span>
          </h1>
          <p className="text-lg sm:text-xl text-app-muted max-w-xl mx-auto leading-relaxed font-medium">
            Dump your thoughts in 60 seconds. ClearHead organises them into tasks, ideas, worries and reminders — so you don't have to.
          </p>
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <Link
            href="/login"
            className="inline-flex px-10 py-4 bg-gradient-to-br from-app-primary to-app-secondary text-white rounded-2xl font-bold text-lg focus:outline-none focus:ring-4 focus:ring-app-primary/30 transition-all duration-300 shadow-[0_0_30px_rgba(123,110,246,0.3)] hover:shadow-[0_0_40px_rgba(123,110,246,0.5)] transform hover:-translate-y-1 hover:scale-[1.02]"
          >
            Clear my head — it's free
          </Link>
        </div>
      </div>
    </main>
  );
}
