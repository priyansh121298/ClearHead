import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import sgMail from '@sendgrid/mail';

// const resend = new Resend(process.env.RESEND_API_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Use the service role key to securely query user data without needing an active session
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    // 3. Fetch user prefs to ensure weekly report is enabled
    const { data: prefs } = await supabaseAdmin
      .from('user_prefs')
      .select('weekly_report_enabled')
      .eq('user_id', userId)
      .single();
      
    // Default to true if prefs not found or explicitly set
    if (prefs && prefs.weekly_report_enabled === false) {
      return NextResponse.json({ message: 'Weekly report disabled for this user' }, { status: 200 });
    }

    // 4. Query dumps and dump_items from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Fetch items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('dump_items')
      .select(`
        id,
        text,
        category,
        is_completed,
        created_at,
        dumps!inner(user_id)
      `)
      .eq('dumps.user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());
      
    if (itemsError) {
      console.error('Failed to fetch items:', itemsError);
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'No activity in the last 7 days to report on' }, { status: 200 });
    }

    // Calculate basic stats
    const totalTasks = items.filter(i => i.category === 'TASK').length;
    const completedTasks = items.filter(i => i.category === 'TASK' && i.is_completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const categoriesCount = items.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    let mostCommonCategory = 'None';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoriesCount)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonCategory = cat;
      }
    }
    
    const worryCount = items.filter(i => i.category === 'WORRY').length;

    // Filter out worries from content sent to Claude
    const safeItems = items
      .filter(i => i.category !== 'WORRY')
      .map(i => ({ category: i.category, text: i.text, is_completed: i.is_completed }));
      
    const promptText = `
You are a warm, non-judgmental, insightful assistant analyzing a user's weekly "mind dumps".
Generate a short Weekly Mental Clarity Synthesis based on the following data.

Data:
Total tasks logged: ${totalTasks}
Tasks completed: ${completedTasks} (${completionRate}%)
Most common category logged: ${mostCommonCategory}
Worries logged (count only): ${worryCount}
Recent items (excluding worries):
${JSON.stringify(safeItems)}

Generate exactly 3 things in JSON format:
1. "reflection": A brief, warm 2-3 sentence reflection on the week. (e.g. "You cleared 8 of 12 things this week - that's real progress, not perfection")
2. "observation": One gently phrased pattern observation if relevant based on the item text or stats. Keep it low-pressure.
3. "suggestion": One small, low-pressure suggestion for the week ahead based on what you see.

Output ONLY valid JSON in this format:
{
  "reflection": "...",
  "observation": "...",
  "suggestion": "..."
}
`;

    let reflection = "";
    if (totalTasks > 0) {
      const thingWord = totalTasks === 1 ? 'thing' : 'things';
      reflection += `This week you dumped ${totalTasks} ${thingWord} and cleared ${completedTasks} of them - that's real progress, not a race.`;
    }
    if (worryCount > 0) {
      const worryWord = worryCount === 1 ? '1 worry' : `${worryCount} worries`;
      const pronoun = worryCount === 1 ? 'it' : 'them';
      reflection += `${reflection ? ' ' : ''}You also gave yourself space to name ${worryWord} instead of carrying ${pronoun} silently.`;
    }
    if (!reflection) {
      reflection = "You took time for yourself this week to offload your thoughts.";
    }
    reflection += " Small steps count.";
    let observation = "";
    let suggestion = "";

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 500,
        temperature: 0.4,
        system: "You are a warm, supportive assistant. Return only valid JSON.",
        messages: [{ role: 'user', content: promptText }],
      });

      if (response.content[0].type === 'text') {
        const text = response.content[0].text;
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.reflection) reflection = parsed.reflection;
        if (parsed.observation) observation = parsed.observation;
        if (parsed.suggestion) suggestion = parsed.suggestion;
      }
    } catch (e) {
      console.error('Failed to generate synthesis with Claude, using fallback stats:', e);
      // Fallback already assigned above
    }

    // 5. Send email via Resend
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #050508; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #050508; padding: 40px 20px;">
          <tr>
            <td align="center">
              <!-- Main Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <!-- Header -->
                <tr>
                  <td style="padding-bottom: 32px;">
                    <img src="https://clear-head-theta.vercel.app/clearhead-wordmark.svg" width="140" height="auto" alt="ClearHead" style="display: block; border: 0;" />
                  </td>
                </tr>
                <!-- Greeting -->
                <tr>
                  <td style="padding-bottom: 24px; font-size: 18px; color: #F0EFF8; font-weight: 500;">
                    Your Weekly Synthesis
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #13121F; border-radius: 12px; border-left: 4px solid #7B6EF6; padding: 24px; margin-bottom: 16px;">
                          <p style="font-size: 15px; color: #F0EFF8; line-height: 1.6; margin: 0 0 16px 0;">
                            ${reflection}
                          </p>
                          ${observation ? `
                          <p style="font-size: 15px; color: #F0EFF8; line-height: 1.6; margin: 0 0 16px 0;">
                            <strong>Observation:</strong> ${observation}
                          </p>` : ''}
                          ${suggestion ? `
                          <p style="font-size: 15px; color: #F0EFF8; line-height: 1.6; margin: 0;">
                            <strong>Suggestion:</strong> ${suggestion}
                          </p>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Stats Row -->
                <tr>
                  <td style="padding-top: 24px; padding-bottom: 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="33%" align="center" style="background-color: #13121F; border-radius: 12px; padding: 16px; margin-right: 8px;">
                          <div style="font-size: 24px; font-weight: bold; color: #2DD4BF; margin-bottom: 4px;">${totalTasks}</div>
                          <div style="font-size: 12px; color: #8E8BA8; text-transform: uppercase; letter-spacing: 0.05em;">Tasks Dumped</div>
                        </td>
                        <td width="33%" align="center" style="background-color: #13121F; border-radius: 12px; padding: 16px; margin: 0 8px;">
                          <div style="font-size: 24px; font-weight: bold; color: #7B6EF6; margin-bottom: 4px;">${completionRate}%</div>
                          <div style="font-size: 12px; color: #8E8BA8; text-transform: uppercase; letter-spacing: 0.05em;">Completion</div>
                        </td>
                        <td width="33%" align="center" style="background-color: #13121F; border-radius: 12px; padding: 16px; margin-left: 8px;">
                          <div style="font-size: 24px; font-weight: bold; color: #F87171; margin-bottom: 4px;">${worryCount}</div>
                          <div style="font-size: 12px; color: #8E8BA8; text-transform: uppercase; letter-spacing: 0.05em;">Worries Offloaded</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Closing Message -->
                <tr>
                  <td style="padding-top: 16px; padding-bottom: 32px; font-size: 15px; color: #F0EFF8; line-height: 1.6;">
                    Here's to a clear head and a steady pace next week.
                  </td>
                </tr>
                <!-- CTA -->
                <tr>
                  <td style="padding-bottom: 40px;" align="center">
                    <a href="${siteUrl}/app/dump" style="display: inline-block; background-color: #7B6EF6; background: linear-gradient(135deg, #7B6EF6, #2DD4BF); color: #ffffff; font-size: 15px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
                      Open ClearHead
                    </a>
                  </td>
                </tr>
                <!-- Sign-off -->
                <tr>
                  <td style="padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 15px; color: #8E8BA8; line-height: 1.6;">
                    - ClearHead
                  </td>
                </tr>
              </table>
              
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; padding-top: 24px;">
                <tr>
                  <td align="center" style="font-size: 12px; color: #8E8BA8; line-height: 1.5;">
                    You're getting this because your weekly report is turned on.<br>
                    <a href="${siteUrl}/app/settings" style="color: #8E8BA8; text-decoration: underline;">Manage this anytime in Settings</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // const { data: emailData, error: emailError } = await resend.emails.send({
    //   from: 'ClearHead <onboarding@resend.dev>',
    //   to: user.email,
    //   subject: 'Your Weekly Synthesis — ClearHead',
    //   html: htmlBody,
    // });
    
    let emailData;
    try {
      const response = await sgMail.send({
        to: user.email,
        from: 'opuchapuchik@gmail.com',
        subject: 'Your Weekly Synthesis — ClearHead',
        html: htmlBody,
      });
      emailData = { id: response[0].headers['x-message-id'] };
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Weekly report sent', id: emailData?.id }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in weekly-report route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
