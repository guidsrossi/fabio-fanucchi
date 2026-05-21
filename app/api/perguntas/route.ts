import { NextResponse } from 'next/server';
import { getRows } from '@/lib/sheets';

export async function GET() {
  const perguntas = await getRows('perguntas');
  return NextResponse.json({ success: true, perguntas });
}
