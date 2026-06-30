export type CategoriaConselho = 'A' | 'E' | 'D' | 'T';
export type SituacaoConselho = 'sem_classificacao' | 'azul' | 'rosa' | 'verde';

export function calcularSituacaoPorMarcacoes(
  marcacoes: Record<string, CategoriaConselho | '' | undefined>
): SituacaoConselho {
  const categorias = Object.values(marcacoes).filter(Boolean);

  if (categorias.length === 0) return 'sem_classificacao';

  const temDificuldade = categorias.some((categoria) => categoria === 'D' || categoria === 'T');
  const temAssiduidade = categorias.some((categoria) => categoria === 'A' || categoria === 'T');

  if (temDificuldade && temAssiduidade) return 'rosa';
  if (temDificuldade) return 'azul';

  return 'verde';
}
