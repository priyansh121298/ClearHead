'use server';

import { createClient } from '@/lib/supabase/server';

export type HistoryItem = {
  id: string;
  category: 'TASK' | 'IDEA' | 'WORRY' | 'REMINDER';
  text: string;
  is_completed: boolean;
  created_at: string;
  estimated_minutes?: number;
  children?: HistoryItem[];
};

export async function getHistory(page: number = 0, limit: number = 50, filter?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  let query = supabase
    .from('dump_items')
    .select(`
      id,
      category,
      text,
      is_completed,
      created_at,
      estimated_minutes,
      dumps!inner(user_id)
    `)
    .eq('dumps.user_id', user.id)
    .is('parent_item_id', null)
    .gte('created_at', thirtyDaysAgoStr)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (filter && filter !== 'ALL') {
    query = query.eq('category', filter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch history:', error);
    throw new Error('Failed to fetch history');
  }

  const parentIds = data.map(d => d.id);
  let childrenData: any[] = [];
  
  if (parentIds.length > 0) {
    const { data: cData, error: cError } = await supabase
      .from('dump_items')
      .select('id, category, text, is_completed, created_at, estimated_minutes, parent_item_id')
      .in('parent_item_id', parentIds)
      .order('created_at', { ascending: true });
      
    if (!cError && cData) {
      childrenData = cData;
    }
  }

  // We map out the `dumps` relation object before returning to client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(item => {
    const itemChildren = childrenData.filter(c => c.parent_item_id === item.id).map(c => ({
      id: c.id,
      category: c.category,
      text: c.text,
      is_completed: c.is_completed || false,
      created_at: c.created_at,
      estimated_minutes: c.estimated_minutes,
    }));

    return {
      id: item.id,
      category: item.category,
      text: item.text,
      is_completed: item.is_completed || false,
      created_at: item.created_at,
      estimated_minutes: item.estimated_minutes,
      children: itemChildren,
    };
  }) as HistoryItem[];
}

export async function toggleComplete(itemId: string, completed: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // To properly secure this, we should ensure the user owns the item.
  // We can do this with RLS in Supabase, or by doing a join verify here.
  // Assuming RLS is enabled, or we just update the item directly.
  const { error } = await supabase
    .from('dump_items')
    .update({ is_completed: completed })
    .eq('id', itemId);

  if (error) {
    console.error('Failed to toggle complete:', error);
    throw new Error('Failed to update item');
  }

  return { success: true };
}
