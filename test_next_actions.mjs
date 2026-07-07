import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
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
      dumps!inner(user_id)
    `)
    .eq('category', 'TASK')
    .eq('is_completed', false)
    .gte('created_at', fourteenDaysAgoStr)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('DB Error:', error);
    return;
  }

  console.log('Fetched tasks count:', data.length);
  if (data.length === 0) return;

  const tasksToRank = data.slice(0, 50);

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

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
      console.log('Anthropic Raw Response:', text);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log('Parsed JSON:', parsed);
    }
  } catch (e) {
    console.error('Anthropic Error:', e);
  }
}

run();
