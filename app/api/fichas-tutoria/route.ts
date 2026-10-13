import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { criarFicha, editarFicha, excluirFicha, listarFichas } from '@/lib/fichas-tutoria';
import { isEstudante, isGestao, isProfessor } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const user: any = await getUserFromCookie();
  if (!user || (!isProfessor(user.perfil) && !isGestao(user.perfil) && !isEstudante(user.perfil))) {
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

export async function DELETE(request: NextRequest) {
  const user: any = await getUserFromCookie();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  if (!isProfessor(user.perfil)) return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
  let dados: any;
  try {
    dados = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Informe a ficha a excluir' }, { status: 400 });
  }
  try {
    const resultado = await excluirFicha(user, dados);
    return NextResponse.json(resultado, { status: resultado.success ? 200 : resultado.status || 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Não foi possível concluir a exclusão. Tente novamente.' }, { status: 500 });
  }
}
