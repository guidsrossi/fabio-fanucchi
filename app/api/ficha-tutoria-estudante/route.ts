import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { obterFichaEstudante, salvarFichaEstudante } from '@/lib/ficha-estudante';
import { isGestao, isProfessor } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const user: any = await getUserFromCookie();
  if (!user || (!isProfessor(user.perfil) && !isGestao(user.perfil))) {
    return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
  }
  const resultado = await obterFichaEstudante(user, request.nextUrl.searchParams.get('estudante_id') || '');
  return NextResponse.json(resultado, { status: resultado.success ? 200 : 403 });
}

export async function PUT(request: NextRequest) {
  const user: any = await getUserFromCookie();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  const corpo = await request.json();
  try {
    const resultado = await salvarFichaEstudante(user, corpo.estudante_id, corpo.dados);
    return NextResponse.json(resultado, { status: resultado.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Dados inválidos' }, { status: 400 });
  }
}
