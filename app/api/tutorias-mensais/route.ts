import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { isGestao } from '@/lib/permissions';
import {
  gerarRelatorioTutorias,
  listarTutoriasDoProfessor,
  mesAtualReferencia,
  normalizarMes,
  salvarTutoriasDoProfessor,
} from '@/lib/tutorias';

export async function GET(req: NextRequest) {
  const user: any = await getUserFromCookie();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Nao autenticado' });
  }

  const { searchParams } = new URL(req.url);
  const mes = normalizarMes(searchParams.get('mes')) || mesAtualReferencia();

  if (user.perfil === 'professor') {
    const estudantes = await listarTutoriasDoProfessor(user.id, mes);

    return NextResponse.json({
      success: true,
      mes,
      estudantes,
    });
  }

  if (isGestao(user.perfil)) {
    const relatorio = await gerarRelatorioTutorias({
      mes,
      turma: searchParams.get('turma') || '',
      professorId: searchParams.get('professor_id') || '',
      estudanteId: searchParams.get('estudante_id') || '',
    });

    return NextResponse.json({
      success: true,
      relatorio,
    });
  }

  return NextResponse.json({ success: false, error: 'Acesso negado' });
}

async function salvar(req: NextRequest) {
  const user: any = await getUserFromCookie();

  if (!user || user.perfil !== 'professor') {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const body = await req.json();
  const resultado = await salvarTutoriasDoProfessor(user.id, body.mes, body.registros || []);

  if (!resultado.success) {
    return NextResponse.json(resultado);
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  return salvar(req);
}

export async function PUT(req: NextRequest) {
  return salvar(req);
}
