import dadosCadastrais from '@/data/dados-cadastrais-estudantes.json';

function normalizarNome(valor: unknown) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chaveCadastro(nome: unknown, turma: unknown) {
  return `${String(turma || '').trim().toUpperCase()}|${normalizarNome(nome)}`;
}

export function normalizarRa(valor: unknown) {
  const ra = String(valor || '')
    .replace(/\D/g, '')
    .replace(/^0+/, '');

  return ra || '';
}

function pareceRa(valor: unknown) {
  const ra = normalizarRa(valor);
  return ra.length >= 7 && /^\d+$/.test(ra);
}

export function obterRaDoEstudante(estudante: any) {
  if (pareceRa(estudante?.ra)) return String(estudante.ra).trim();

  const cadastro: any = dadosCadastrais.find(
    (item: any) => chaveCadastro(item.nome, item.turma) === chaveCadastro(estudante?.nome, estudante?.turma)
  );

  if (pareceRa(cadastro?.ra)) return String(cadastro.ra).trim();
  if (pareceRa(estudante?.login)) return String(estudante.login).trim();

  return '';
}
