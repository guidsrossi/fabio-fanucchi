import { getRows } from '@/lib/sheets';

export type NotaMapao = {
  nome: string; turma: string; serie: string; situacao: string;
  frequencia: string; frequencia_anual: string; fonte: string;
  notas: Array<{ disciplina: string; nota: number; bimestre: number }>;
  mencoes: Array<{ disciplina: string; mencao: string }>;
};

export async function carregarNotasMapao(ano: number, bimestre: number): Promise<NotaMapao[]> {
  if (ano !== 2026 || bimestre !== 3) return [];
  const rows = await getRows('notas_mapao');
  return rows.filter((row: any) => Number(row.ano) === ano && Number(row.bimestre) === bimestre)
    .map((row: any) => ({
      nome: String(row.nome || ''), turma: String(row.turma || ''), serie: String(row.serie || ''),
      situacao: String(row.situacao || ''), frequencia: String(row.frequencia || ''),
      frequencia_anual: String(row.frequencia_anual || ''), fonte: String(row.fonte || ''),
      notas: JSON.parse(row.notas_json || '[]'), mencoes: JSON.parse(row.mencoes_json || '[]'),
    }));
}

export function chaveNomeConselho(nome: unknown) {
  return String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

export function notasIniciaisConselho(fontes: NotaMapao[], turma: string, nome: string) {
  return fontes.find((item) => item.turma === turma && chaveNomeConselho(item.nome) === chaveNomeConselho(nome));
}
