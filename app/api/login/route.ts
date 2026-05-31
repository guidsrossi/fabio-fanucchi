import { NextResponse } from 'next/server';
import { getRows } from '@/lib/sheets';
import { createToken } from '@/lib/auth';

function precisaTrocarSenha(valor: unknown) {
  return ['sim', 'true', '1', 'yes'].includes(String(valor || '').trim().toLowerCase());
}

function normalizarLogin(valor: unknown) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export async function POST(req: Request) {
  const { login, senha } = await req.json();
  const loginNormalizado = normalizarLogin(login);

  const usuarios = await getRows('usuarios');
  const user = usuarios.find(
    (u: any) =>
      [u.login, u.nome]
        .map((valor) => normalizarLogin(valor))
        .filter(Boolean)
        .includes(loginNormalizado) && u.senha === senha
  );

  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Login ou senha invalidos',
    });
  }

  const userPayload = {
    id: user.id,
    nome: user.nome,
    login: user.login || user.nome,
    perfil: user.perfil,
    turma: user.turma || '',
    precisa_trocar_senha: precisaTrocarSenha(user.precisa_trocar_senha),
  };

  const token = createToken(userPayload);

  const response = NextResponse.json({ success: true, user: userPayload });
  response.cookies.set('token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return response;
}
