import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/backend/lib/admin-auth';
import { createAdminClient } from '@/backend/lib/supabase/admin';

type AdminUserListItem = {
  id: string;
  email: string | null;
  name: string | null;
  district_name: string | null;
  party: string | null;
  created_at: string;
  generations_count: number;
};

export async function GET(request: NextRequest) {
  try {
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
      .select('id, name, district_name, party, created_at', { count: 'exact' })
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
    try {
      const { data: authData, error: authError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (!authError && authData?.users) {
        for (const authUser of authData.users) {
          if (profileIds.includes(authUser.id)) {
            authUserMap.set(authUser.id, authUser.email ?? null);
          }
        }
      }
    } catch {
      // Auth admin API may not be available — degrade gracefully without emails
    }

    const users: AdminUserListItem[] = (profiles ?? []).map((profile) => ({
      id: profile.id,
      email: authUserMap.get(profile.id) ?? null,
      name: profile.name ?? null,
      district_name: profile.district_name ?? null,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
