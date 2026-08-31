import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { listarFichas } from '@/lib/fichas-tutoria';
import { isGestao, isProfessor } from '@/lib/permissions';
import notasPrimeiroBimestre from '@/data/notas-primeiro-bimestre.json';

const NOTAS_API_URL =
  'https://script.google.com/macros/s/AKfycbw0paUzVSySRSNOh_tFv26DKMYfwXwjVsjttvT3xhXtxWAKwmjnaJKI1BqIlfKjlPis/exec';

const BIMESTRES_2026: Record<number, { inicio: string; fim: string }> = {
  1: { inicio: '2026-02-02', fim: '2026-04-22' },
  2: { inicio: '2026-04-23', fim: '2026-07-06' },
  3: { inicio: '2026-07-24', fim: '2026-10-02' },
  4: { inicio: '2026-10-05', fim: '2026-12-18' },
};

function chaveEstudante(nome: unknown, turma: unknown) {
  const nomeNormalizado = String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((palavra) => palavra && !['DE', 'DA', 'DO', 'DAS', 'DOS', 'E'].includes(palavra))
    .join(' ');
  return `${String(turma || '').trim().toUpperCase()}|${nomeNormalizado}`;
}

export async function GET(request: NextRequest) {
  const user: any = await getUserFromCookie();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Usuário não autenticado' },
      { status: 401 }
    );
  }

  const bimestre = Number(request.nextUrl.searchParams.get('bimestre') || 1);
  const ano = Number(request.nextUrl.searchParams.get('ano') || 2026);

  if (!Number.isInteger(bimestre) || bimestre < 1 || bimestre > 4) {
    return NextResponse.json(
      { success: false, error: 'Informe um bimestre entre 1 e 4' },
      { status: 400 }
    );
  }

  if (ano !== 2026) {
    return NextResponse.json(
      { success: false, error: 'O calendário de bimestres está configurado para 2026' },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      action: 'students',
      ano: String(ano),
      bimestre: String(bimestre),
      cache: String(Date.now()),
    });
    const podeConsultarFichas = isProfessor(user.perfil) || isGestao(user.perfil);
    const [dadosRemotos, dadosFichas] = await Promise.all([
      fetch(`${NOTAS_API_URL}?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(30_000) })
        .then(async (response) => {
          if (!response.ok) throw new Error(`A fonte de dados respondeu com HTTP ${response.status}`);
          const data = await response.json();
          if (!data.success) throw new Error(data.error || 'Não foi possível carregar os estudantes');
          return data;
        })
        .catch((error) => {
          if (bimestre === 1) return { success: true, students: [] };
          throw error;
        }),
      podeConsultarFichas
        ? listarFichas(user).catch(() => ({ fichas: [], estudantes: [], professores: [], podeEditar: false }))
        : Promise.resolve({ fichas: [], estudantes: [], professores: [], podeEditar: false }),
    ]);

    const estudantesRemotos = Array.isArray(dadosRemotos.students) ? dadosRemotos.students : [];
    const remotosPorChave = new Map(
      estudantesRemotos.map((estudante: any) => [chaveEstudante(estudante.nome, estudante.turma), estudante])
    );
    const estudantesFonte = bimestre === 1
      ? notasPrimeiroBimestre.map((estudante: any) => {
          const remoto: any = remotosPorChave.get(chaveEstudante(estudante.nome, estudante.turma));
          return {
            ...estudante,
            tutor: remoto?.tutor || remoto?.professor || '',
            foto: remoto?.foto || null,
          };
        })
      : estudantesRemotos;

    const periodo = BIMESTRES_2026[bimestre];
    const estudantesInternos = new Map<string, string>(
      (dadosFichas.estudantes as any[]).map((estudante: any): [string, string] => [
        chaveEstudante(estudante.nome, estudante.turma),
        String(estudante.id || '').trim(),
      ])
    );
    const contagemPorEstudante = (dadosFichas.fichas as any[]).reduce((acc: Record<string, number>, ficha: any) => {
      const dataFicha = String(ficha.data || '');
      if (dataFicha >= periodo.inicio && dataFicha <= periodo.fim) {
        const estudanteId = String(ficha.estudante_id || '').trim();
        acc[estudanteId] = (acc[estudanteId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const students = estudantesFonte.map((estudante: any) => {
      const estudanteInternoId = estudantesInternos.get(chaveEstudante(estudante.nome, estudante.turma));
      return {
        ...estudante,
        ...(estudanteInternoId
          ? {
              tutoria_estudante_id: estudanteInternoId,
              tutorias_bimestre: contagemPorEstudante[estudanteInternoId] || 0,
              pode_gerar_pdf_tutorias: true,
            }
          : {}),
      };
    });

    return NextResponse.json(
      { success: true, ano, bimestre, periodo, students },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      { success: false, error: `Erro ao consultar as notas bimestrais: ${message}` },
      { status: 502 }
    );
  }
}
