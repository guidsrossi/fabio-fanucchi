import { NextResponse } from 'next/server';
import { appendRow, getRows } from '@/lib/sheets';
import { getUserFromCookie } from '@/lib/auth';

function estaAtivo(valor: unknown) {
  return !['nao', 'false', '0'].includes(String(valor || '').trim().toLowerCase());
}

async function getEstudantesDoProfessor(professorId: string) {
  try {
    const vinculos = await getRows('professor_estudantes');

    return vinculos
      .filter((vinculo: any) => vinculo.professor_id === professorId && estaAtivo(vinculo.ativo))
      .map((vinculo: any) => String(vinculo.estudante_id || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET() {
  const user: any = await getUserFromCookie();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Nao autenticado' });
  }

  const apoios = await getRows('apoios');
  const usuarios = await getRows('usuarios');
  const respostas = await getRows('respostas');
  const perguntas = await getRows('perguntas');

  let lista = apoios.map((apoio: any) => {
    const professor = usuarios.find((u: any) => u.id === apoio.professor_id);
    const estudante = usuarios.find((u: any) => u.id === apoio.estudante_id);

    return {
      ...apoio,
      professor_nome: professor?.nome || 'Professor nao encontrado',
      estudante_nome: estudante?.nome || 'Estudante nao encontrado',
      respostas: respostas
        .filter((r: any) => r.apoio_id === apoio.id)
        .map((r: any) => ({
          pergunta: perguntas.find((p: any) => p.id === r.pergunta_id)?.pergunta || '',
          resposta: r.resposta,
        })),
    };
  });

  if (user.perfil === 'professor') {
    lista = lista.filter((a: any) => a.professor_id === user.id);
  }

  if (user.perfil === 'estudante') {
    lista = lista.filter((a: any) => a.estudante_id === user.id);
  }

  return NextResponse.json({ success: true, apoios: lista });
}

export async function POST(req: Request) {
  const user: any = await getUserFromCookie();

  if (!user || user.perfil !== 'professor') {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const body = await req.json();
  const usuarios = await getRows('usuarios');
  const estudante = usuarios.find(
    (item: any) => item.id === body.estudante_id && item.perfil === 'estudante'
  );

  if (!estudante) {
    return NextResponse.json({ success: false, error: 'Estudante nao encontrado' });
  }

  const estudantesDoProfessor = await getEstudantesDoProfessor(user.id);
  const turmaDoEstudante = String(estudante.turma || '').trim();

  if (!estudantesDoProfessor.includes(String(estudante.id || '').trim())) {
    return NextResponse.json({
      success: false,
      error: 'Este estudante nao esta vinculado a voce',
    });
  }

  const apoios = await getRows('apoios');
  const respostas = await getRows('respostas');

  const apoioId = String(apoios.length + 1);

  await appendRow('apoios', [
    apoioId,
    body.estudante_id,
    user.id,
    turmaDoEstudante,
    body.disciplina,
    new Date().toLocaleDateString('pt-BR'),
    body.feedback,
    'pendente',
    '',
  ]);

  for (const resposta of body.respostas || []) {
    await appendRow('respostas', [
      String(respostas.length + 1 + body.respostas.indexOf(resposta)),
      apoioId,
      resposta.pergunta_id,
      resposta.resposta,
    ]);
  }

  return NextResponse.json({ success: true });
}
