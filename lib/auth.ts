import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export function createToken(user: any) {
  return jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '1d' });
}

export async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
}
