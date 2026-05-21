import { NextResponse } from 'next/server';
import { getRows, updateRow } from '@/lib/sheets';
import { getUserFromCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const user: any = await getUserFromCookie();

  if (!user || user.perfil !== 'estudante') {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const { apoio_id, status, observacao } = await req.json();

  const apoios = await getRows('apoios');
  const index = apoios.findIndex((a: any) => a.id === apoio_id && a.estudante_id === user.id);

  if (index === -1) {
    return NextResponse.json({ success: false, error: 'Apoio não encontrado' });
  }

  const apoio = apoios[index];

  await updateRow('apoios', index + 2, [
    apoio.id,
    apoio.estudante_id,
    apoio.professor_id,
    apoio.turma,
    apoio.disciplina,
    apoio.data,
    apoio.feedback,
    status,
    observacao || '',
  ]);

  return NextResponse.json({ success: true });
}
