'use server';

import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export type NextActionItem = {
  id: string;
  category: 'TASK';
  text: string;
  is_completed: boolean;
  priority_rank: 'priority' | 'easy_win' | 'optional';
  estimated_minutes?: number;
  usedFallback?: boolean;
};

export async function getNextActions(): Promise<{ success: boolean; data?: NextActionItem[]; error?: string; usedFallback?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoStr = fourteenDaysAgo.toISOString();

  const { data, error } = await supabase
    .from('dump_items')
    .select(`
      id,
      category,
      text,
      is_completed,
      priority_rank,
      estimated_minutes,
      created_at,
      dumps!inner(user_id)
    `)
    .eq('dumps.user_id', user.id)
    .eq('category', 'TASK')
    .is('parent_item_id', null)
    .eq('is_completed', false)
    .gte('created_at', fourteenDaysAgoStr)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch tasks for Next Actions:', error);
    return { success: false, error: 'Failed to fetch tasks' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks = (data as any[]).map(item => ({
    id: item.id,
    text: item.text,
    priority_rank: item.priority_rank as 'priority' | 'easy_win' | 'optional' | null,
    estimated_minutes: item.estimated_minutes as number | undefined,
    created_at: new Date(item.created_at).getTime(),
  }));

  if (tasks.length === 0) {
    return { success: true, data: [] };
  }

  const alreadyRankedTasks = tasks.filter(t => t.priority_rank !== null);
  const unrankedTasks = tasks.filter(t => t.priority_rank === null);

  const getFullList = (pool: typeof tasks) => {
    // Sort pool by created_at desc (newest first)
    const sortedPool = [...pool].sort((a, b) => b.created_at - a.created_at);
    const priority = sortedPool.find(t => t.priority_rank === 'priority');
    const easy_win = sortedPool.find(t => t.priority_rank === 'easy_win' && t.id !== priority?.id);
    
    const result: NextActionItem[] = [];
    if (priority) result.push({ id: priority.id, category: 'TASK', text: priority.text, is_completed: false, priority_rank: 'priority', estimated_minutes: priority.estimated_minutes });
    if (easy_win) result.push({ id: easy_win.id, category: 'TASK', text: easy_win.text, is_completed: false, priority_rank: 'easy_win', estimated_minutes: easy_win.estimated_minutes });
    
    // Everything else is optional
    sortedPool.forEach(t => {
      if (t.id !== priority?.id && t.id !== easy_win?.id) {
        result.push({ id: t.id, category: 'TASK', text: t.text, is_completed: false, priority_rank: 'optional', estimated_minutes: t.estimated_minutes });
      }
    });
    
    return result;
  };

  // If all tasks are already ranked, just return full list
  if (unrankedTasks.length === 0) {
    return { success: true, data: getFullList(alreadyRankedTasks) };
  }

  let newRanks: { id: string, priority_rank: 'priority' | 'easy_win' | 'optional' }[] = [];
  let usedFallback = false;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const tasksToRank = unrankedTasks.slice(0, 50);
  const promptText = `
You are an ADHD-aware task prioritizer. I have a list of incomplete tasks.
Select up to 3 tasks from this list and categorize them exactly as follows:
- 1 "priority" (most urgent/important, look for deadlines or keywords like "urgent", "asap")
- 1 "easy_win" (quick, low-effort, low estimated minutes)
- 1 "optional" (lower priority, can wait)

If there are fewer than 3 tasks, just categorize the available ones logically. Ensure you do not use the same rank more than once.
Output ONLY valid JSON in this format:
{
  "actions": [
    { "id": "task-id", "priority_rank": "priority" },
    { "id": "task-id", "priority_rank": "easy_win" }
  ]
}

Tasks:
${JSON.stringify(tasksToRank.map(t => ({ id: t.id, text: t.text, estimated_minutes: t.estimated_minutes })))}
  `;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      temperature: 0,
      system: "You are a helpful task prioritizing assistant. Return only valid JSON.",
      messages: [{ role: 'user', content: promptText }],
    });

    if (response.content[0].type === 'text') {
      const text = response.content[0].text;
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as { actions: { id: string, priority_rank: 'priority' | 'easy_win' | 'optional' }[] };
      newRanks = parsed.actions;
    } else {
      throw new Error('Unexpected response type from Claude');
    }
  } catch (e) {
    console.error('Failed to get next actions from Claude, using fallback heuristic:', e);
    usedFallback = true;
    
    // Fallback logic
    const fallbackTasks = [...tasksToRank];
    
    // Priority: oldest created_at
    fallbackTasks.sort((a, b) => a.created_at - b.created_at);
    const priorityTask = fallbackTasks.shift();
    if (priorityTask) newRanks.push({ id: priorityTask.id, priority_rank: 'priority' });

    // Easy Win: lowest estimated_minutes
    fallbackTasks.sort((a, b) => {
      const aMins = a.estimated_minutes || 9999;
      const bMins = b.estimated_minutes || 9999;
      return aMins - bMins;
    });
    const easyWinTask = fallbackTasks.shift();
    if (easyWinTask) newRanks.push({ id: easyWinTask.id, priority_rank: 'easy_win' });

    // Optional: any remaining (will be handled below)
  }

  // Ensure ALL unranked tasks receive a rank in DB so we don't repeatedly ask Claude
  tasksToRank.forEach(t => {
    if (!newRanks.find(r => r.id === t.id)) {
      newRanks.push({ id: t.id, priority_rank: 'optional' });
    }
  });

  // Update DB with the new priority_ranks
  const updatePromises = newRanks.map(action => 
    supabase
      .from('dump_items')
      .update({ priority_rank: action.priority_rank })
      .eq('id', action.id)
  );
  
  await Promise.all(updatePromises);

  // Merge newly ranked tasks into the pool
  const newlyRankedTasks = newRanks.map(action => {
    const originalTask = tasks.find(t => t.id === action.id);
    return {
      ...originalTask!,
      priority_rank: action.priority_rank,
    };
  });

  const finalPool = [...alreadyRankedTasks, ...newlyRankedTasks];
  const finalFullList = getFullList(finalPool);

  if (usedFallback) {
    finalFullList.forEach(t => t.usedFallback = true);
  }

  return { success: true, data: finalFullList, usedFallback };
}
