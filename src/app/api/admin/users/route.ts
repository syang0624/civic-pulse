import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/backend/lib/admin-auth';
import { createAdminClient } from '@/backend/lib/supabase/admin';

type AdminUserListItem = {
  id: string;
  email: string | null;
  name: string | null;
  district_name: string | null;
  election_type: string | null;
  party: string | null;
  created_at: string;
  generations_count: number;
};

export async function GET(request: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? '20')));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const admin = createAdminClient();

  const { data: profiles, count, error: profilesError } = await admin
    .from('profiles')
    .select('id, name, district_name, election_type, party, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileIds = (profiles ?? []).map((profile) => profile.id);

  const generationCounts = new Map<string, number>();
  if (profileIds.length > 0) {
    const { data: generations, error: generationsError } = await admin
      .from('generations')
      .select('profile_id')
      .in('profile_id', profileIds);

    if (generationsError) {
      return NextResponse.json({ error: generationsError.message }, { status: 500 });
    }

    for (const row of generations ?? []) {
      const profileId = row.profile_id as string;
      generationCounts.set(profileId, (generationCounts.get(profileId) ?? 0) + 1);
    }
  }

  const authUserMap = new Map<string, string | null>();
  await Promise.all(
    profileIds.map(async (profileId) => {
      const { data: authUserData, error } = await admin.auth.admin.getUserById(profileId);
      if (!error && authUserData.user) {
        authUserMap.set(profileId, authUserData.user.email ?? null);
      }
    }),
  );

  const users: AdminUserListItem[] = (profiles ?? []).map((profile) => ({
    id: profile.id,
    email: authUserMap.get(profile.id) ?? null,
    name: profile.name ?? null,
    district_name: profile.district_name ?? null,
    election_type: profile.election_type ?? null,
    party: profile.party ?? null,
    created_at: profile.created_at,
    generations_count: generationCounts.get(profile.id) ?? 0,
  }));

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
    },
  });
}
