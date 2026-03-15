import { NextResponse } from 'next/server';
import { createAdminClient } from '@/backend/lib/supabase/admin';
import { crawlIssuesForDistrict } from '@/backend/services/issue-crawler';
import { ELECTION_DISTRICTS } from '@/shared/constants';

const MAX_DISTRICTS_PER_RUN = 5;
const DISTRICT_DELAY_MS = 4_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return Boolean(vercelCronHeader);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('district_code, district_name')
    .not('district_code', 'is', null);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const dedupedDistricts = new Map<string, { districtCode: string; districtName: string }>();

  for (const profile of profiles ?? []) {
    const districtCode = profile.district_code?.trim();
    if (!districtCode) {
      continue;
    }

    const existing = dedupedDistricts.get(districtCode);
    const districtName = profile.district_name?.trim() ?? '';
    if (existing) {
      if (!existing.districtName && districtName) {
        dedupedDistricts.set(districtCode, { districtCode, districtName });
      }
      continue;
    }

    dedupedDistricts.set(districtCode, {
      districtCode,
      districtName,
    });
  }

  const districts = Array.from(dedupedDistricts.values())
    .sort((a, b) => a.districtCode.localeCompare(b.districtCode))
    .slice(0, MAX_DISTRICTS_PER_RUN);

  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let index = 0; index < districts.length; index += 1) {
    const district = districts[index];
    const regionName = ELECTION_DISTRICTS[district.districtCode]?.name ?? district.districtCode;

    const result = await crawlIssuesForDistrict(
      admin,
      district.districtCode,
      district.districtName,
      regionName,
      false,
    );

    if (result.error) {
      errors.push(`${district.districtCode}: ${result.error}`);
    } else if (result.skipped) {
      skipped += 1;
    } else {
      processed += 1;
    }

    if (index < districts.length - 1) {
      await sleep(DISTRICT_DELAY_MS);
    }
  }

  return NextResponse.json({
    processed,
    skipped,
    errors,
  });
}
