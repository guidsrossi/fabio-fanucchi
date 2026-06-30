import type { SituacaoConselho } from '@/lib/conselho-regras';

// Classificação visual transcrita das faixas coloridas das fichas entregues.
// A posição acompanha a lista alfabética de estudantes de cada turma.
const SITUACOES_2026_1: Record<string, { primeiroId: number; codigos: string }> = {
  '1A': { primeiroId: 25, codigos: '_a_ar_ar_ra_____avaav_aar_aa_araa__ra__r_r' },
  '1B': { primeiroId: 67, codigos: 'a_a_rrrr_ra__aa__rrara_rar__a_aarara' },
  '1C': { primeiroId: 103, codigos: 'rar_r_v_arraarrr_araa__r_____a_a_a___' },
  '1D': { primeiroId: 140, codigos: '__a_aarraa_a__a_ra_____a_a_aaaaar__a_a' },
  '1E': { primeiroId: 178, codigos: '____aa_r__raar__a__r____a__a_r___a__a_' },
  '2A': { primeiroId: 216, codigos: '_a_a_aa_aaa_araara_a_a_aa_a___a__' },
  '2B': { primeiroId: 249, codigos: '_____r____arraa_ara_aa____a______' },
  '2C': { primeiroId: 282, codigos: 'a_araraar__aa_a_a___r_a___aa_____arar' },
  '2D': { primeiroId: 319, codigos: '____a_aara_rrrrrrr_r_r_ra___a_rar_r' },
  '3A': { primeiroId: 354, codigos: 'a_aaaa_aaa_aara___a____' },
  '3B': { primeiroId: 377, codigos: 'a_ar_arrara_raa_a___ara_aa_ara' },
  '3C': { primeiroId: 407, codigos: 'aaaaaaaarrrarraaaaaaaaaaaa_' },
  '3D': { primeiroId: 434, codigos: 'aaaaaa__aa_______aaaaaaarr_' },
  '3E': { primeiroId: 461, codigos: 'aaaaa__aaaaara_aaaa_____a_' },
};

const CODIGO_SITUACAO: Record<string, SituacaoConselho> = {
  a: 'azul',
  r: 'rosa',
  v: 'verde',
  _: 'sem_classificacao',
};

export function situacaoInicialDaFicha(
  ano: number,
  bimestre: number,
  turma: string,
  estudanteId: string
): SituacaoConselho {
  if (ano !== 2026 || bimestre !== 1) return 'sem_classificacao';

  const configuracao = SITUACOES_2026_1[String(turma || '').trim().toUpperCase()];
  const indice = Number(estudanteId) - (configuracao?.primeiroId || 0);
  const codigo = configuracao?.codigos[indice];
  return CODIGO_SITUACAO[codigo] || 'sem_classificacao';
}

export function fonteDigitalizada(ano: number, bimestre: number, turma: string) {
  const turmaNormalizada = String(turma || '').trim().toUpperCase();

  if (ano !== 2026 || bimestre !== 1 || !SITUACOES_2026_1[turmaNormalizada]) return '';
  return `/api/conselho/ficha?ano=2026&bimestre=1&turma=${encodeURIComponent(turmaNormalizada)}`;
}
