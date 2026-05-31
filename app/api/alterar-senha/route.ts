import { NextResponse } from 'next/server';
import { createToken, getUserFromCookie } from '@/lib/auth';
import { getRows, updateRow } from '@/lib/sheets';

function precisaTrocarSenha(valor: unknown) {
  return ['sim', 'true', '1', 'yes'].includes(String(valor || '').trim().toLowerCase());
}

export async function POST(req: Request) {
  const user: any = await getUserFromCookie();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Nao autenticado' });
  }

  const { senhaAtual, novaSenha } = await req.json();
  const novaSenhaLimpa = String(novaSenha || '');

  if (novaSenhaLimpa.length < 6) {
    return NextResponse.json({
      success: false,
      error: 'A nova senha precisa ter pelo menos 6 caracteres',
    });
  }

  const usuarios = await getRows('usuarios');
  const index = usuarios.findIndex((usuario: any) => usuario.id === user.id);

  if (index === -1) {
    return NextResponse.json({ success: false, error: 'Usuario nao encontrado' });
  }

  const usuario = usuarios[index];
  const trocaObrigatoria = precisaTrocarSenha(usuario.precisa_trocar_senha);

  if (!trocaObrigatoria && String(senhaAtual || '') !== usuario.senha) {
    return NextResponse.json({ success: false, error: 'Senha atual incorreta' });
  }

  if (novaSenhaLimpa === usuario.senha) {
    return NextResponse.json({
      success: false,
      error: 'A nova senha deve ser diferente da senha atual',
    });
  }

  await updateRow('usuarios', index + 2, [
    usuario.id,
    usuario.nome,
    usuario.login || usuario.nome,
    novaSenhaLimpa,
    usuario.perfil,
    usuario.turma || '',
    'nao',
  ]);

  const updatedUser = {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login || usuario.nome,
    perfil: usuario.perfil,
    turma: usuario.turma || '',
    precisa_trocar_senha: false,
  };

  const token = createToken(updatedUser);
  const response = NextResponse.json({ success: true, user: updatedUser });

  response.cookies.set('token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return response;
}
