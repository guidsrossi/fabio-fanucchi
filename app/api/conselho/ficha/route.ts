import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { isCoordenador } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user: any = await getUserFromCookie();

  if (!user || !isCoordenador(user.perfil)) {
    return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const ano = searchParams.get('ano');
  const bimestre = searchParams.get('bimestre');
  const turma = String(searchParams.get('turma') || '').trim().toUpperCase();

  if (ano !== '2026' || bimestre !== '1' || !/^[123][A-E]$/.test(turma)) {
    return NextResponse.json({ success: false, error: 'Ficha não encontrada' }, { status: 404 });
  }

  try {
    const arquivo = await readFile(
      path.join(process.cwd(), 'private', 'conselho', '2026-1', `${turma}.jpeg`)
    );

    return new NextResponse(arquivo, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="conselho-2026-1-${turma}.jpeg"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Ficha não encontrada' }, { status: 404 });
  }
}
