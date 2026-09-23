import { NextResponse } from 'next/server';
import { appendRow, getRows } from '@/lib/sheets';
import { getUserFromCookie } from '@/lib/auth';
import { isProfessor } from '@/lib/permissions';
import { normalizarRa, obterRaDoEstudante } from '@/lib/estudantes';

const SENHA_INICIAL_ESTUDANTE = '123456';

function isGestao(perfil: string) {
  return perfil === 'gestao' || perfil === 'gestor';
}

function normalizarLogin(valor: unknown) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

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

  if (!user || !isProfessor(user.perfil)) {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const estudantesDoProfessor = await getEstudantesDoProfessor(user.id);
  const usuarios = await getRows('usuarios');
  const estudantes = usuarios.filter((usuario: any) => usuario.perfil === 'estudante');

  return NextResponse.json({
    success: true,
    estudantes: estudantes
      .filter((estudante: any) => estudantesDoProfessor.includes(String(estudante.id || '').trim()))
      .map((estudante: any) => ({
        id: estudante.id,
        nome: estudante.nome,
        login: obterRaDoEstudante(estudante),
        ra: obterRaDoEstudante(estudante),
        turma: estudante.turma,
      })),
  });
}

export async function POST(req: Request) {
  const user: any = await getUserFromCookie();

  if (!user || !isGestao(user.perfil)) {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const body = await req.json();
  const nome = String(body.nome || '').trim();
  const turma = String(body.turma || '').trim();
  const ra = String(body.ra || '').trim();
  const raNormalizado = normalizarRa(ra);
  const login = raNormalizado;

  if (!nome || !turma || !/^\d{7,}$/.test(raNormalizado)) {
    return NextResponse.json({
      success: false,
      error: 'Informe nome, RA válido e turma do estudante',
    });
  }

  const usuarios = await getRows('usuarios');
  const loginJaExiste = usuarios.some((usuario: any) =>
    usuario.perfil === 'estudante'
      ? normalizarRa(obterRaDoEstudante(usuario)) === raNormalizado
      : [usuario.login, usuario.nome]
          .map((valor) => normalizarLogin(valor))
          .filter(Boolean)
          .includes(normalizarLogin(login))
  );

  if (loginJaExiste) {
    return NextResponse.json({
      success: false,
      error: 'Ja existe um usuario com este login',
    });
  }

  const ids = usuarios
    .map((usuario: any) => Number(usuario.id))
    .filter((id) => Number.isFinite(id));
  const estudanteId = String((ids.length ? Math.max(...ids) : 0) + 1);

  await appendRow('usuarios', [
    estudanteId,
    nome,
    login,
    SENHA_INICIAL_ESTUDANTE,
    'estudante',
    turma,
    'sim',
    ra,
    '',
  ]);

  return NextResponse.json({
    success: true,
    estudante: {
      id: estudanteId,
      nome,
      login,
      ra,
      turma,
      perfil: 'estudante',
      precisa_trocar_senha: true,
    },
    senha_temporaria: SENHA_INICIAL_ESTUDANTE,
  });
}
