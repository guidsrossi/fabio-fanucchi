import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { criarFicha, editarFicha, listarFichas } from '@/lib/fichas-tutoria';
import { isGestao, isProfessor } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const user: any = await getUserFromCookie();
  if (!user || (!isProfessor(user.perfil) && !isGestao(user.perfil))) {
    return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
  }
  const resultado = await listarFichas(
    user,
    request.nextUrl.searchParams.get('mes') || '',
    request.nextUrl.searchParams.get('estudante_id') || ''
  );
  return NextResponse.json({ success: true, ...resultado });
}

export async function POST(request: NextRequest) {
  const user: any = await getUserFromCookie();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  const resultado = await criarFicha(user, await request.json());
  return NextResponse.json(resultado, { status: resultado.success ? 200 : 400 });
}

export async function PUT(request: NextRequest) {
  const user: any = await getUserFromCookie();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  const resultado = await editarFicha(user, await request.json());
  return NextResponse.json(resultado, { status: resultado.success ? 200 : 400 });
}
