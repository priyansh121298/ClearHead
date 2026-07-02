'use server';

import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export type DumpItem = {
  id: string;
  type: 'TASK' | 'IDEA' | 'WORRY' | 'REMINDER';
  content: string;
};

export async function processDump(rawText: string): Promise<{ success: boolean; data?: DumpItem[]; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!rawText || rawText.trim().length === 0) {
    return { success: false, error: 'Text is empty' };
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      temperature: 0,
      system: `You are a calm, helpful assistant. The user will provide a raw, unstructured brain dump.
Your goal is to parse and sort their thoughts into exactly four categories: TASKS, IDEAS, WORRIES, and REMINDERS.
Return ONLY a valid JSON array of objects. Do not include markdown formatting like \`\`\`json.
Each object must have exactly two properties:
- "type": must be exactly one of "TASK", "IDEA", "WORRY", "REMINDER"
- "content": the text of the thought, summarized concisely.

Example response:
[
  { "type": "TASK", "content": "Buy groceries for dinner" },
  { "type": "WORRY", "content": "Upcoming presentation might go poorly" }
]`,
      messages: [{ role: 'user', content: rawText }],
    });

    let textResponse = '';
    
    // Anthropic response content blocks
    if (response.content[0].type === 'text') {
      textResponse = response.content[0].text;
    } else {
      return { success: false, error: 'Unexpected response from AI' };
    }

    // Strip out any markdown code blocks if the AI still included them
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(textResponse) as Omit<DumpItem, 'id'>[];
    
    const formattedData: DumpItem[] = parsed.map(item => ({
      id: crypto.randomUUID(),
      type: item.type,
      content: item.content
    }));

    return { success: true, data: formattedData };
  } catch (error: unknown) {
    console.error('Error processing dump:', error);
    return { success: false, error: 'Failed to process dump. Please try again.' };
  }
}
