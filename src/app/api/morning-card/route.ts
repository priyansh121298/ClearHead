import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Use the service role key to securely query user data without needing an active session
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // 1. Check CRON_SECRET authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // 2. Fetch the user's email using Supabase Admin API
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      console.error('Failed to fetch user:', userError);
      return NextResponse.json({ error: 'User not found or has no email' }, { status: 404 });
    }

    // 3. Query incomplete tasks from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('dump_items')
      .select(`
        id,
        text,
        created_at,
        dumps!inner(user_id)
      `)
      .eq('dumps.user_id', userId)
      .eq('category', 'TASK')
      .eq('is_completed', false)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    if (tasksError) {
      console.error('Failed to fetch tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ message: 'No incomplete tasks to send' }, { status: 200 });
    }

    // 4. Send email via Resend
    const tasksHtml = tasks.map(task => 
      `<li style="margin-bottom: 12px; line-height: 1.5; color: #334155; list-style: none; display: flex; align-items: flex-start;">
        <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #cbd5e1; border-radius: 4px; margin-right: 12px; margin-top: 3px;"></span>
        <span>${task.text}</span>
      </li>`
    ).join('');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a; background-color: #ffffff;">
        <p style="font-size: 16px; margin-bottom: 24px; color: #475569;">Good morning. Here are a few things you were thinking about doing.</p>
        
        <ul style="padding: 0; margin: 0 0 32px 0;">
          ${tasksHtml}
        </ul>

        <p style="font-size: 15px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
          <a href="${siteUrl}/app/dump" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Go to ClearHead &rarr;</a>
        </p>
      </div>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'ClearHead <onboarding@resend.dev>',
      to: user.email,
      subject: 'Your 3 things for today — ClearHead',
      html: htmlBody,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Email sent', id: emailData?.id }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in morning-card route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
