import { NextResponse } from 'next/server';
import { getRows } from '@/lib/sheets';
import { getUserFromCookie } from '@/lib/auth';

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
