'use server';

import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import * as Sentry from "@sentry/nextjs";

export type ChunkedTask = {
  id: string;
  category: 'TASK';
  text: string;
  is_completed: boolean;
  estimated_minutes?: number;
  parent_item_id: string;
  created_at: string;
};

export async function chunkTask(itemId: string): Promise<{ success: boolean; data?: ChunkedTask[]; error?: string; usedFallback?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Fetch the target task text
  const { data: taskData, error: taskError } = await supabase
    .from('dump_items')
    .select('id, text, dump_id, estimated_minutes')
    .eq('id', itemId)
    .single();

  if (taskError || !taskData) {
    console.error('Failed to fetch task for chunking:', taskError);
    return { success: false, error: 'Task not found' };
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const promptText = `
You are an ADHD-aware task breakdown assistant. 
Take the following task and break it down into 3 to 5 smaller, sequential sub-steps. 
Make sure each sub-step is highly actionable, clear, and takes less than 15 minutes to complete.
Output ONLY valid JSON in this format:
{
  "steps": [
    { "text": "Step 1 description", "estimated_minutes": 5 },
    { "text": "Step 2 description", "estimated_minutes": 10 }
  ]
}

Task to break down: "${taskData.text}"
  `;

  let parsedSteps: { text: string; estimated_minutes: number }[] = [];
  let usedFallback = false;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      temperature: 0,
      system: "You are a helpful task breakdown assistant. Return only valid JSON.",
      messages: [{ role: 'user', content: promptText }],
    });

    if (response.content[0].type === 'text') {
      const text = response.content[0].text;
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as { steps: { text: string; estimated_minutes: number }[] };
      parsedSteps = parsed.steps;
    } else {
      throw new Error('Unexpected response type from Claude');
    }
  } catch (e) {
    console.error('Failed to chunk task via Claude, using fallback:', e);
    Sentry.captureException(e);
    usedFallback = true;
    
    const baseMinutes = taskData.estimated_minutes ? Math.max(1, Math.round(taskData.estimated_minutes / 3)) : 5;
    parsedSteps = [
      { text: `Start: ${taskData.text}`, estimated_minutes: baseMinutes },
      { text: `Continue: ${taskData.text}`, estimated_minutes: baseMinutes },
      { text: `Finish: ${taskData.text}`, estimated_minutes: baseMinutes },
    ];
  }

  // Insert these sub-steps into dump_items
  const now = new Date().getTime();
  const itemsToInsert = parsedSteps.map((step, index) => ({
    dump_id: taskData.dump_id,
    user_id: user.id,
    category: 'TASK',
    text: step.text,
    estimated_minutes: step.estimated_minutes,
    parent_item_id: taskData.id,
    created_at: new Date(now + index * 1000).toISOString(),
  }));

  const { data: insertedData, error: insertError } = await supabase
    .from('dump_items')
    .insert(itemsToInsert)
    .select();

  if (insertError || !insertedData) {
    console.error('Failed to insert chunked tasks:', insertError);
    return { success: false, error: 'Failed to save sub-steps' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedData: ChunkedTask[] = (insertedData as any[]).map(item => ({
    id: item.id,
    category: 'TASK',
    text: item.text,
    is_completed: item.is_completed || false,
    estimated_minutes: item.estimated_minutes,
    parent_item_id: item.parent_item_id,
    created_at: item.created_at,
  }));

  formattedData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return { success: true, data: formattedData, usedFallback };
}
