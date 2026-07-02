'use server';

import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export type DumpResult = {
  items: Array<{
    category: 'TASK' | 'IDEA' | 'WORRY' | 'REMINDER';
    text: string;
  }>;
  summary: string;
  count: {
    tasks: number;
    ideas: number;
    worries: number;
    reminders: number;
  };
};

export async function processDump(rawText: string, userId: string) {
  const supabase = createClient();
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let parsedJson: DumpResult | null = null;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 2048,
      temperature: 0,
      system: `You are ClearHead, an ADHD-aware thought organizer. 
Sort each thought into: TASK (action verb + object, max 8 words), 
IDEA (interesting, no action needed), WORRY (acknowledge warmly 
in one sentence, then file it), REMINDER (time or person bound, 
extract when/who). Never judge. Never moralize. Be warm but neutral.
Output ONLY valid JSON: 
{items:[{category,text}], summary:string, count:{tasks,ideas,worries,reminders}}`,
      messages: [{ role: 'user', content: rawText }],
    });

    if (response.content[0].type === 'text') {
      const text = response.content[0].text;
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(cleaned) as DumpResult;
    }
  } catch (e) {
    console.error('Anthropic API or parsing failed:', e);
  }

  // Handle errors: if JSON parsing fails, store raw text and return fallback message
  if (!parsedJson) {
    const { error: dumpError } = await supabase.from('dumps').insert({
      user_id: userId,
      raw_text: rawText,
      summary: 'Fallback: Thoughts recorded but unsorted.',
    });

    if (dumpError) console.error('Failed to save raw dump to Supabase:', dumpError);

    return {
      success: false,
      message: "We safely saved your thoughts, but had trouble sorting them right now. They're tucked away safely!",
    };
  }

  // Write the dump to 'dumps' table
  const { data: dumpData, error: dumpError } = await supabase.from('dumps').insert({
    user_id: userId,
    raw_text: rawText,
    summary: parsedJson.summary,
  }).select('id').single();

  if (dumpError || !dumpData) {
    console.error('Failed to save dump to Supabase:', dumpError);
    return {
      success: false,
      message: "Something went wrong while saving your sorted thoughts. Please try again.",
    };
  }

  // Write each item to the 'dump_items' table
  const itemsToInsert = parsedJson.items.map(item => ({
    dump_id: dumpData.id,
    category: item.category,
    text: item.text,
  }));

  const { error: itemsError } = await supabase.from('dump_items').insert(itemsToInsert);

  if (itemsError) {
    console.error('Failed to save dump items to Supabase:', itemsError);
    // Even if items fail, we have the dump, but we'll return an error just in case
    return {
      success: false,
      message: "We saved your dump, but had trouble filing the specific items.",
    };
  }

  // Return the parsed items to the client
  return {
    success: true,
    data: parsedJson.items,
  };
}
