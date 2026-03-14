import { NextResponse } from 'next/server';
import { getAdminUser } from '@/backend/lib/admin-auth';

export async function GET() {
  const adminUser = await getAdminUser();
  return NextResponse.json({ isAdmin: Boolean(adminUser) });
}
