import { NextResponse } from 'next/server';
import { getAdminUser } from '@/backend/lib/admin-auth';
import { createAdminClient } from '@/backend/lib/supabase/admin';

type UserProfile = {
  id: string;
  name: string | null;
  district_name: string | null;
  district_code: string | null;
  party: string | null;
  tone: string | null;
  background: string | null;
  created_at: string;
};

type UserGeneration = {
  id: string;
  tool: string;
  input_params: Record<string, unknown>;
  created_at: string;
  locale: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, name, district_name, district_code, party, tone, background, created_at')
    .eq('id', id)
    .maybeSingle<UserProfile>();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: generationRows, error: generationsError } = await admin
    .from('generations')
    .select('id, tool, input_params, created_at, locale')
    .eq('profile_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (generationsError) {
    return NextResponse.json({ error: generationsError.message }, { status: 500 });
  }

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(id);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const generations: UserGeneration[] = (generationRows ?? []).map((row) => ({
    id: row.id,
    tool: row.tool,
    input_params: (row.input_params ?? {}) as Record<string, unknown>,
    created_at: row.created_at,
    locale: row.locale,
  }));

  return NextResponse.json({
    user: {
      ...profile,
      email: authData.user.email ?? null,
    },
    generations,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    name?: unknown;
    district_name?: unknown;
    district_code?: unknown;
    party?: unknown;
  };

  const updates: Partial<{
    name: string | null;
    district_name: string | null;
    district_code: string | null;
    party: string | null;
  }> = {};

  function normalizeField(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value !== 'string') {
      return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  const normalizedName = normalizeField(body.name);
  if (normalizedName !== undefined) {
    updates.name = normalizedName;
  }

  const normalizedDistrictName = normalizeField(body.district_name);
  if (normalizedDistrictName !== undefined) {
    updates.district_name = normalizedDistrictName;
  }

  const normalizedDistrictCode = normalizeField(body.district_code);
  if (normalizedDistrictCode !== undefined) {
    updates.district_code = normalizedDistrictCode;
  }

  const normalizedParty = normalizeField(body.party);
  if (normalizedParty !== undefined) {
    updates.party = normalizedParty;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: updatedProfile, error: updateError } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, name, district_name, district_code, party, tone, background, created_at')
    .maybeSingle<UserProfile>();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updatedProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: updatedProfile });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (id === adminUser.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: profileDeleteError } = await admin
    .from('profiles')
    .delete()
    .eq('id', id);

  if (profileDeleteError) {
    return NextResponse.json({ error: profileDeleteError.message }, { status: 500 });
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(id);
  if (authDeleteError) {
    return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
