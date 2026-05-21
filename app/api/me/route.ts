import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';

export async function GET() {
  const user = await getUserFromCookie();

  if (!user) {
    return NextResponse.json({ success: false });
  }

  return NextResponse.json({ success: true, user });
}
