import { NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { createAdminClient } from '@/backend/lib/supabase/admin';
import { crawlIssuesForDistrict } from '@/backend/services/issue-crawler';
import { ELECTION_DISTRICTS } from '@/shared/constants';

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('district_code, district_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.district_code) {
    return NextResponse.json(
      { error: 'Profile district is required to crawl issues' },
      { status: 400 },
    );
  }

  const districtCode = profile.district_code;
  const districtName = profile.district_name ?? '';
  const regionName = ELECTION_DISTRICTS[districtCode]?.name ?? districtCode;

  const result = await crawlIssuesForDistrict(
    admin,
    districtCode,
    districtName,
    regionName,
    force,
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (result.skipped) {
    return NextResponse.json({
      data: [],
      inserted: 0,
      updated: 0,
      skipped: true,
      message: 'Issues already crawled today for this district',
    });
  }

  return NextResponse.json({
    data: result.data ?? [],
    inserted: result.inserted,
    updated: result.updated,
    source_count: result.sourceCount ?? 0,
  });
}
