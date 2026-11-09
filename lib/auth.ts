import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getRows } from '@/lib/sheets';
import { isEstudante } from '@/lib/permissions';

export function createToken(user: any) {
  return jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '1d' });
}

export async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    // Uma conta excluída não pode continuar usando um cookie já emitido.
    if (typeof user !== 'string' && isEstudante(user.perfil)) {
      const usuarios = await getRows('usuarios');
      const existe = usuarios.some((usuario: any) =>
        String(usuario.id || '').trim() === String(user.id || '').trim() && isEstudante(usuario.perfil)
      );
      if (!existe) return null;
    }
    return user;
  } catch {
    return null;
  }
}
