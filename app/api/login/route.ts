import { NextResponse } from 'next/server';
import { getRows } from '@/lib/sheets';
import { createToken } from '@/lib/auth';

function precisaTrocarSenha(valor: unknown) {
  return ['sim', 'true', '1', 'yes'].includes(String(valor || '').trim().toLowerCase());
}

export async function POST(req: Request) {
  const { email, senha } = await req.json();
  const emailNormalizado = String(email || '').trim().toLowerCase();

  const usuarios = await getRows('usuarios');
  const user = usuarios.find(
    (u: any) => String(u.email || '').trim().toLowerCase() === emailNormalizado && u.senha === senha
  );

  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'E-mail ou senha invalidos',
    });
  }

  const userPayload = {
    id: user.id,
    nome: user.nome,
    email: user.email,
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
