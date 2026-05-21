import { NextResponse } from 'next/server';
import { appendRow, getRows } from '@/lib/sheets';
import { getUserFromCookie } from '@/lib/auth';

const SENHA_INICIAL_ESTUDANTE = '123456';

function isGestao(perfil: string) {
  return perfil === 'gestao' || perfil === 'gestor';
}

function gerarEmailEstudante(nome: string) {
  const partes = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) return '';

  const primeiroNome = partes[0];
  const ultimoNome = partes.length > 1 ? partes[partes.length - 1] : '';
  const usuario = [primeiroNome, ultimoNome].filter(Boolean).join('.');

  return `${usuario}@escola.com`;
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

  if (!user || user.perfil !== 'professor') {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const estudantesDoProfessor = await getEstudantesDoProfessor(user.id);
  const estudantes = await getRows('estudantes');

  return NextResponse.json({
    success: true,
    estudantes: estudantes.filter((estudante: any) =>
      estudantesDoProfessor.includes(String(estudante.id || '').trim())
    ),
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
  const email = gerarEmailEstudante(nome);

  if (!nome || !turma) {
    return NextResponse.json({
      success: false,
      error: 'Informe nome e turma do estudante',
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
  const estudanteId = String((ids.length ? Math.max(...ids) : 0) + 1);

  await appendRow('usuarios', [
    estudanteId,
    nome,
    email,
    SENHA_INICIAL_ESTUDANTE,
    'estudante',
    turma,
    'sim',
  ]);

  await appendRow('estudantes', [estudanteId, nome, email, turma]);

  return NextResponse.json({
    success: true,
    estudante: {
      id: estudanteId,
      nome,
      email,
      turma,
      perfil: 'estudante',
      precisa_trocar_senha: true,
    },
    senha_temporaria: SENHA_INICIAL_ESTUDANTE,
  });
}
