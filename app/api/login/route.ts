import { NextResponse } from 'next/server';
import { getRows } from '@/lib/sheets';
import { createToken } from '@/lib/auth';
import { normalizarRa, obterRaDoEstudante } from '@/lib/estudantes';

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
  const loginRaSomenteNumeros = /^\d+$/.test(String(login || '').trim());

  const usuarios = await getRows('usuarios');
  const user = usuarios.find((u: any) => {
    const estudante = normalizarLogin(u.perfil) === 'estudante';
    const loginCorresponde = estudante
      ? Boolean(
          loginRaSomenteNumeros &&
          normalizarRa(login) &&
          normalizarRa(obterRaDoEstudante(u)) === normalizarRa(login)
        )
      : [u.login, u.nome]
          .map((valor) => normalizarLogin(valor))
          .filter(Boolean)
          .includes(loginNormalizado);

    return loginCorresponde && u.senha === senha;
  });

  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Login ou senha invalidos',
    });
  }

  const userPayload = {
    id: user.id,
    nome: user.nome,
    login:
      normalizarLogin(user.perfil) === 'estudante'
        ? obterRaDoEstudante(user)
        : user.login || user.nome,
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
