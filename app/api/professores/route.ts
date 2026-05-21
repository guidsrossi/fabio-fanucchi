import { NextResponse } from 'next/server';
import { appendRow, getRows, updateRow } from '@/lib/sheets';
import { getUserFromCookie } from '@/lib/auth';

const SENHA_INICIAL_PROFESSOR = '123456';
const ABA_VINCULOS = 'professor_estudantes';

function isGestao(perfil: string) {
  return perfil === 'gestao' || perfil === 'gestor';
}

function estaAtivo(valor: unknown) {
  return !['nao', 'false', '0'].includes(String(valor || '').trim().toLowerCase());
}

async function getVinculos() {
  try {
    return await getRows(ABA_VINCULOS);
  } catch {
    return [];
  }
}

export async function GET() {
  const user: any = await getUserFromCookie();

  if (!user || !isGestao(user.perfil)) {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const usuarios = await getRows('usuarios');
  const estudantes = await getRows('estudantes');
  const vinculos = await getVinculos();

  const professores = usuarios
    .filter((usuario: any) => usuario.perfil === 'professor')
    .map((professor: any) => ({
      id: professor.id,
      nome: professor.nome,
      email: professor.email,
    }));

  const vinculoAtivoPorEstudante = vinculos.reduce((acc: any, vinculo: any) => {
    if (estaAtivo(vinculo.ativo)) {
      acc[String(vinculo.estudante_id || '').trim()] = String(vinculo.professor_id || '').trim();
    }

    return acc;
  }, {});

  const vinculosPorProfessor = professores.reduce((acc: any, professor: any) => {
    acc[professor.id] = Array.from(
      new Set(
        vinculos
          .filter((vinculo: any) => vinculo.professor_id === professor.id && estaAtivo(vinculo.ativo))
          .map((vinculo: any) => String(vinculo.estudante_id || '').trim())
          .filter(Boolean)
      )
    );

    return acc;
  }, {});

  return NextResponse.json({
    success: true,
    professores,
    estudantes: estudantes.map((estudante: any) => ({
      id: estudante.id,
      nome: estudante.nome,
      email: estudante.email,
      turma: estudante.turma,
      professor_id: vinculoAtivoPorEstudante[String(estudante.id || '').trim()] || '',
    })),
    vinculosPorProfessor,
  });
}

export async function POST(req: Request) {
  const user: any = await getUserFromCookie();

  if (!user || !isGestao(user.perfil)) {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const body = await req.json();
  const nome = String(body.nome || '').trim();
  const email = String(body.email || '').trim().toLowerCase();

  if (!nome || !email) {
    return NextResponse.json({
      success: false,
      error: 'Informe nome e e-mail do professor',
    });
  }

  const usuarios = await getRows('usuarios');
  const emailJaExiste = usuarios.some(
    (usuario: any) => String(usuario.email || '').trim().toLowerCase() === email
  );

  if (emailJaExiste) {
    return NextResponse.json({
      success: false,
      error: 'Ja existe um usuario com este e-mail',
    });
  }

  const ids = usuarios
    .map((usuario: any) => Number(usuario.id))
    .filter((id) => Number.isFinite(id));
  const professorId = String((ids.length ? Math.max(...ids) : 0) + 1);

  await appendRow('usuarios', [
    professorId,
    nome,
    email,
    SENHA_INICIAL_PROFESSOR,
    'professor',
    '',
    'sim',
  ]);

  return NextResponse.json({
    success: true,
    professor: {
      id: professorId,
      nome,
      email,
      perfil: 'professor',
      precisa_trocar_senha: true,
    },
    senha_temporaria: SENHA_INICIAL_PROFESSOR,
  });
}

export async function PUT(req: Request) {
  const user: any = await getUserFromCookie();

  if (!user || !isGestao(user.perfil)) {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const body = await req.json();
  const professorId = String(body.professor_id || '').trim();
  const estudantesRecebidos = Array.isArray(body.estudantes) ? body.estudantes : [];

  const usuarios = await getRows('usuarios');
  const professor = usuarios.find(
    (usuario: any) => usuario.id === professorId && usuario.perfil === 'professor'
  );

  if (!professor) {
    return NextResponse.json({ success: false, error: 'Professor nao encontrado' });
  }

  const estudantes = await getRows('estudantes');
  const estudantesExistentes = estudantes.map((estudante: any) => String(estudante.id || '').trim());
  const estudantesSelecionados = Array.from(
    new Set(
      estudantesRecebidos
        .map((estudanteId: any) => String(estudanteId || '').trim())
        .filter((estudanteId: string) => estudantesExistentes.includes(estudanteId))
    )
  );

  let vinculos;

  try {
    vinculos = await getRows(ABA_VINCULOS);
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Crie a aba professor_estudantes na planilha antes de salvar vinculos',
    });
  }

  const estudantesComOutroProfessor = vinculos
    .filter((vinculo: any) => vinculo.professor_id !== professorId && estaAtivo(vinculo.ativo))
    .map((vinculo: any) => String(vinculo.estudante_id || '').trim());
  const estudanteIndisponivel = estudantesSelecionados.find((estudanteId) =>
    estudantesComOutroProfessor.includes(estudanteId)
  );

  if (estudanteIndisponivel) {
    const estudante = estudantes.find((item: any) => String(item.id || '').trim() === estudanteIndisponivel);

    return NextResponse.json({
      success: false,
      error: `${estudante?.nome || 'Este estudante'} ja esta vinculado a outro professor`,
    });
  }

  const ids = vinculos
    .map((vinculo: any) => Number(vinculo.id))
    .filter((id) => Number.isFinite(id));
  let proximoId = (ids.length ? Math.max(...ids) : 0) + 1;

  for (const vinculo of vinculos) {
    if (vinculo.professor_id !== professorId) continue;

    const deveAtivar = estudantesSelecionados.includes(String(vinculo.estudante_id || '').trim());
    await updateRow(ABA_VINCULOS, vinculos.indexOf(vinculo) + 2, [
      vinculo.id,
      vinculo.professor_id,
      vinculo.estudante_id,
      deveAtivar ? 'sim' : 'nao',
    ]);
  }

  for (const estudanteId of estudantesSelecionados) {
    const jaExiste = vinculos.some(
      (vinculo: any) =>
        vinculo.professor_id === professorId &&
        String(vinculo.estudante_id || '').trim() === estudanteId
    );

    if (jaExiste) continue;

    await appendRow(ABA_VINCULOS, [String(proximoId), professorId, estudanteId, 'sim']);
    proximoId += 1;
  }

  return NextResponse.json({ success: true });
}
