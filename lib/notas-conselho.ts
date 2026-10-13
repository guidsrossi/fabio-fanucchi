import terceiroBimestre from '@/data/notas-terceiro-bimestre.json';

export function chaveNomeConselho(nome: unknown) {
  return String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

export function notasIniciaisConselho(ano: number, bimestre: number, turma: string, nome: string) {
  if (ano !== 2026 || bimestre !== 3 || turma !== '1A') return undefined;
  return terceiroBimestre.find((item) => chaveNomeConselho(item.nome) === chaveNomeConselho(nome));
}
