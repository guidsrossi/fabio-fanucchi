import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import {
  listarConselho,
  normalizarAno,
  normalizarBimestre,
  salvarConselho,
} from '@/lib/conselho';
import { isCoordenador } from '@/lib/permissions';

function acessoNegado() {
  return NextResponse.json({ success: false, error: 'Acesso exclusivo do coordenador' }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const user: any = await getUserFromCookie();
  if (!user || !isCoordenador(user.perfil)) return acessoNegado();

  const { searchParams } = new URL(req.url);
  const ano = normalizarAno(searchParams.get('ano'));
  const bimestre = normalizarBimestre(searchParams.get('bimestre'));
  const turma = String(searchParams.get('turma') || '').trim();

  if (!ano || !bimestre) {
    return NextResponse.json(
      { success: false, error: 'Informe um ano e um bimestre válidos' },
      { status: 400 }
    );
  }

  const conselho = await listarConselho(ano, bimestre, turma || '1A');

  return NextResponse.json({ success: true, ano, bimestre, ...conselho });
}

export async function POST(req: NextRequest) {
  const user: any = await getUserFromCookie();
  if (!user || !isCoordenador(user.perfil)) return acessoNegado();

  const body = await req.json();
  const ano = normalizarAno(body.ano);
  const bimestre = normalizarBimestre(body.bimestre);
  const turma = String(body.turma || '').trim();

  if (!ano || !bimestre || !turma) {
    return NextResponse.json(
      { success: false, error: 'Informe ano, bimestre e turma' },
      { status: 400 }
    );
  }

  const resultado = await salvarConselho(
    ano,
    bimestre,
    turma,
    body.registros || [],
    String(user.id || '')
  );

  return NextResponse.json({ success: true, ...resultado });
}
