import { NextResponse } from 'next/server';
import { getAdminUser } from '@/backend/lib/admin-auth';
import { createAdminClient } from '@/backend/lib/supabase/admin';

type ToolKey = 'speech' | 'email' | 'ad' | 'sentiment' | 'pledge' | 'strategy';

const TOOLS: ToolKey[] = ['speech', 'email', 'ad', 'sentiment', 'pledge', 'strategy'];

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const [usersCountRes, generationsCountRes, issuesCountRes, todayCountRes, recentGenerationsRes] =
    await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('generations').select('id', { count: 'exact', head: true }),
      admin.from('issues').select('id', { count: 'exact', head: true }),
      admin
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      admin
        .from('generations')
        .select('id, profile_id, tool, created_at')
        .order('created_at', { ascending: false })
        .limit(5000),
    ]);

  if (usersCountRes.error) {
    return NextResponse.json({ error: usersCountRes.error.message }, { status: 500 });
  }
  if (generationsCountRes.error) {
    return NextResponse.json({ error: generationsCountRes.error.message }, { status: 500 });
  }
  if (issuesCountRes.error) {
    return NextResponse.json({ error: issuesCountRes.error.message }, { status: 500 });
  }
  if (todayCountRes.error) {
    return NextResponse.json({ error: todayCountRes.error.message }, { status: 500 });
  }
  if (recentGenerationsRes.error) {
    return NextResponse.json({ error: recentGenerationsRes.error.message }, { status: 500 });
  }

  const generations = recentGenerationsRes.data ?? [];

  const byTool: Record<ToolKey, number> = {
    speech: 0,
    email: 0,
    ad: 0,
    sentiment: 0,
    pledge: 0,
    strategy: 0,
  };

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const trendMap = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(sevenDaysAgo);
    day.setDate(sevenDaysAgo.getDate() + i);
    trendMap.set(day.toISOString().slice(0, 10), 0);
  }

  const userGenerationCount = new Map<string, number>();

  for (const generation of generations) {
    const tool = generation.tool as ToolKey;
    if (TOOLS.includes(tool)) {
      byTool[tool] += 1;
    }

    const profileId = generation.profile_id as string;
    userGenerationCount.set(profileId, (userGenerationCount.get(profileId) ?? 0) + 1);

    const dayKey = new Date(generation.created_at).toISOString().slice(0, 10);
    if (trendMap.has(dayKey)) {
      trendMap.set(dayKey, (trendMap.get(dayKey) ?? 0) + 1);
    }
  }

  const topUserIds = [...userGenerationCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const recentActivityBase = generations.slice(0, 10);
  const profileIdsToFetch = Array.from(
    new Set([...topUserIds, ...recentActivityBase.map((item) => item.profile_id as string)]),
  );

  const profileMap = new Map<string, { name: string | null; district_name: string | null }>();
  if (profileIdsToFetch.length > 0) {
    const { data: profileRows, error: profilesError } = await admin
      .from('profiles')
      .select('id, name, district_name')
      .in('id', profileIdsToFetch);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    for (const row of profileRows ?? []) {
      profileMap.set(row.id, {
        name: row.name ?? null,
        district_name: row.district_name ?? null,
      });
    }
  }

  const emailMap = new Map<string, string | null>();
  await Promise.all(
    profileIdsToFetch.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      emailMap.set(id, data.user?.email ?? null);
    }),
  );

  const topUsers = topUserIds.map((id) => ({
    id,
    name: profileMap.get(id)?.name ?? null,
    district_name: profileMap.get(id)?.district_name ?? null,
    email: emailMap.get(id) ?? null,
    generations_count: userGenerationCount.get(id) ?? 0,
  }));

  const recentActivity = recentActivityBase.map((item) => {
    const userId = item.profile_id as string;
    return {
      id: item.id,
      tool: item.tool,
      created_at: item.created_at,
      user: {
        id: userId,
        name: profileMap.get(userId)?.name ?? null,
        email: emailMap.get(userId) ?? null,
      },
    };
  });

  const trend = [...trendMap.entries()].map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    totals: {
      users: usersCountRes.count ?? 0,
      generations: generationsCountRes.count ?? 0,
      issues: issuesCountRes.count ?? 0,
      today_generations: todayCountRes.count ?? 0,
    },
    generations_by_tool: byTool,
    generations_last_7_days: trend,
    top_users: topUsers,
    recent_activity: recentActivity,
  });
}
