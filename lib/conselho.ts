import {
  appendRows,
  batchUpdateRows,
  ensureSheetWithHeaders,
  getRows,
} from '@/lib/sheets';
import { frequenciaAnualConselho } from '@/lib/conselho-frequencia';
import { fonteDigitalizada, situacaoInicialDaFicha } from '@/lib/conselho-seed';
import {
  calcularSituacaoPorMarcacoes,
  type CategoriaConselho,
  type SituacaoConselho,
} from '@/lib/conselho-regras';

export const ABA_CONSELHOS = 'conselhos_classe';

export const CONSELHOS_HEADERS = [
  'id',
  'ano',
  'bimestre',
  'turma',
  'estudante_id',
  'marcacoes_json',
  'situacao',
  'frequencia',
  'observacao',
  'atualizado_por',
  'atualizado_em',
];

export const CATEGORIAS = ['A', 'E', 'D', 'T'] as const;
export const SITUACOES = ['azul', 'rosa', 'verde', 'sem_classificacao'] as const;

export type ComponenteCurricular = {
  codigo: string;
  nome: string;
};

const NOMES_COMPONENTES: Record<string, string> = {
  POR: 'Língua Portuguesa',
  EDF: 'Educação Física',
  GEO: 'Geografia',
  HIS: 'História',
  FIS: 'Física',
  MAT: 'Matemática',
  FIL: 'Filosofia',
  OEP: 'Orientação de Estudos - Língua Portuguesa',
  OEM: 'Orientação de Estudos - Matemática',
  BIO: 'Biologia',
  PV: 'Projeto de Vida',
  PE: 'Práticas Experimentais',
  ING: 'Língua Inglesa',
  EMA: 'Educação Matemática',
  EDFN: 'Educação Financeira',
  RED: 'Redação e Leitura',
  TROB: 'Tecnologia e Robótica',
  ART: 'Arte',
  QUI: 'Componente QUI',
  ATM: 'Componente ATM',
  LID: 'Liderança',
  ORA: 'Oratória',
  GEP: 'Componente GEP',
  SOC: 'Sociologia',
  ATU: 'Atualidades',
  BITC: 'Componente BITC',
  EMP: 'Empreendedorismo',
  IA: 'Inteligência Artificial',
  AEDI: 'Componente AEDI',
  MECD: 'Componente MECD',
  ERIA: 'Componente ERIA',
  PM: 'Projeto Multidisciplinar',
  AM: 'Componente AM',
  BDCN: 'Componente BDCN',
  LLP: 'Componente LLP',
  RDE: 'Componente RDE',
  CCMT: 'Componente CCMT',
  PDS: 'Componente PDS',
  ROB: 'Robótica',
  QAPL: 'Componente QAPL',
};

const COMPONENTES_1 = [
  'POR', 'EDF', 'GEO', 'HIS', 'FIS', 'MAT', 'FIL', 'OEP', 'OEM', 'PV', 'PE', 'ING',
  'EMA', 'EDFN', 'RED', 'TROB', 'ART', 'BIO', 'QUI',
];
const COMPONENTES_2_A_D = [
  'POR', 'EDF', 'GEO', 'HIS', 'FIS', 'MAT', 'BIO', 'ING', 'EDFN', 'RED', 'ATM', 'LID',
  'ORA', 'GEP', 'SOC', 'QUI', 'LLP', 'RDE', 'CCMT', 'PDS',
];
const COMPONENTES_2_B = [
  'POR', 'EDF', 'GEO', 'HIS', 'FIS', 'MAT', 'BIO', 'OEP', 'OEM', 'PV', 'PE', 'ING',
  'EMA', 'EDFN', 'RED', 'ATM', 'LID', 'ORA', 'GEP', 'SOC', 'QUI', 'ROB',
];
const COMPONENTES_2_CDE = [
  'POR', 'EDF', 'GEO', 'HIS', 'FIS', 'MAT', 'BIO', 'OEP', 'OEM', 'PV', 'PE', 'ING',
  'EMA', 'EDFN', 'RED', 'TROB', 'BITC', 'EMP', 'SOC', 'QUI',
];
const COMPONENTES_3_A = [
  'POR', 'EDF', 'HIS', 'FIS', 'MAT', 'ING', 'RED', 'IA', 'AEDI', 'MECD', 'ERIA', 'PM', 'AM',
  'BDCN',
];
const COMPONENTES_3_B = [
  'POR', 'EDF', 'GEO', 'HIS', 'FIS', 'MAT', 'BIO', 'OEP', 'OEM', 'PV', 'PE', 'ING',
  'EMA', 'EDFN', 'RED', 'ATM', 'SOC', 'ATU', 'GEP', 'FIL', 'LID',
];
const COMPONENTES_3_C = [
  'POR', 'EDF', 'GEO', 'HIS', 'FIS', 'MAT', 'BIO', 'OEP', 'OEM', 'PV', 'PE', 'ING',
  'EMA', 'EDFN', 'RED', 'ATM', 'LID', 'SOC', 'ATU', 'GEP', 'FIL',
];
const COMPONENTES_3_DE = [
  'POR', 'EDF', 'GEO', 'HIS', 'FIS', 'MAT', 'OEP', 'OEM', 'PV', 'PE', 'ING', 'EMA',
  'EDFN', 'RED', 'TROB', 'BITC', 'EMP', 'QAPL',
];

function montarComponentes(codigos: string[]) {
  return codigos.map((codigo) => ({
    codigo,
    nome: NOMES_COMPONENTES[codigo] || codigo,
  }));
}

export function componentesDaTurma(turma: string): ComponenteCurricular[] {
  const turmaNormalizada = String(turma || '').trim().toUpperCase();

  if (turmaNormalizada.startsWith('1')) return montarComponentes(COMPONENTES_1);
  if (/^2[AD]$/.test(turmaNormalizada)) return montarComponentes(COMPONENTES_2_A_D);
  if (turmaNormalizada === '2B') return montarComponentes(COMPONENTES_2_B);
  if (turmaNormalizada.startsWith('2')) return montarComponentes(COMPONENTES_2_CDE);
  if (turmaNormalizada === '3A') return montarComponentes(COMPONENTES_3_A);
  if (turmaNormalizada === '3B') return montarComponentes(COMPONENTES_3_B);
  if (turmaNormalizada === '3C') return montarComponentes(COMPONENTES_3_C);
  if (turmaNormalizada.startsWith('3')) return montarComponentes(COMPONENTES_3_DE);

  return montarComponentes(COMPONENTES_1);
}

export function normalizarAno(valor: unknown) {
  const ano = Number(valor);
  return Number.isInteger(ano) && ano >= 2020 && ano <= 2100 ? ano : 0;
}

export function normalizarBimestre(valor: unknown) {
  const bimestre = Number(valor);
  return Number.isInteger(bimestre) && bimestre >= 1 && bimestre <= 4 ? bimestre : 0;
}

function parseMarcacoes(valor: unknown, componentesPermitidos: Set<string>) {
  let marcacoes: Record<string, CategoriaConselho> = {};

  try {
    const recebido = typeof valor === 'string' ? JSON.parse(valor || '{}') : valor;

    if (!recebido || typeof recebido !== 'object' || Array.isArray(recebido)) return marcacoes;

    marcacoes = Object.entries(recebido).reduce((acc, [codigo, categoria]) => {
      const codigoNormalizado = String(codigo || '').trim().toUpperCase();
      const categoriaNormalizada = String(categoria || '').trim().toUpperCase();

      if (
        componentesPermitidos.has(codigoNormalizado) &&
        CATEGORIAS.includes(categoriaNormalizada as CategoriaConselho)
      ) {
        acc[codigoNormalizado] = categoriaNormalizada as CategoriaConselho;
      }

      return acc;
    }, {} as Record<string, CategoriaConselho>);
  } catch {
    return {};
  }

  return marcacoes;
}

function normalizarSituacao(valor: unknown): SituacaoConselho {
  const situacao = String(valor || '').trim().toLowerCase();

  return SITUACOES.includes(situacao as SituacaoConselho)
    ? (situacao as SituacaoConselho)
    : 'sem_classificacao';
}

export async function garantirAbaConselhos() {
  await ensureSheetWithHeaders(ABA_CONSELHOS, CONSELHOS_HEADERS);
}

export async function listarConselho(ano: number, bimestre: number, turma: string) {
  await garantirAbaConselhos();

  const [usuarios, registros] = await Promise.all([getRows('usuarios'), getRows(ABA_CONSELHOS)]);
  const turmaNormalizada = String(turma || '').trim().toUpperCase();
  const componentes = componentesDaTurma(turmaNormalizada);
  const componentesPermitidos = new Set(componentes.map((item) => item.codigo));
  const registrosDaTurma = registros.filter(
    (registro: any) =>
      Number(registro.ano) === ano &&
      Number(registro.bimestre) === bimestre &&
      String(registro.turma || '').trim().toUpperCase() === turmaNormalizada
  );

  const estudantes = usuarios
    .filter(
      (usuario: any) =>
        String(usuario.perfil || '').trim().toLowerCase() === 'estudante' &&
        String(usuario.turma || '').trim().toUpperCase() === turmaNormalizada
    )
    .sort((a: any, b: any) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
    .map((estudante: any) => {
      const registro = registrosDaTurma.find(
        (item: any) => String(item.estudante_id || '').trim() === String(estudante.id || '').trim()
      );

      return {
        id: String(estudante.id || '').trim(),
        nome: estudante.nome || '',
        turma: turmaNormalizada,
        registro_id: registro?.id || '',
        marcacoes: parseMarcacoes(registro?.marcacoes_json || '{}', componentesPermitidos),
        situacao: registro
          ? normalizarSituacao(registro.situacao)
          : situacaoInicialDaFicha(
              ano,
              bimestre,
              turmaNormalizada,
              String(estudante.id || '').trim()
            ),
        frequencia:
          String(registro?.frequencia || '').trim() ||
          frequenciaAnualConselho(ano, bimestre, turmaNormalizada, estudante.nome || ''),
        observacao: registro?.observacao || '',
        atualizado_em: registro?.atualizado_em || '',
      };
    });

  const turmas = Array.from(
    new Set(
      usuarios
        .filter((usuario: any) => String(usuario.perfil || '').trim().toLowerCase() === 'estudante')
        .map((usuario: any) => String(usuario.turma || '').trim().toUpperCase())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return {
    turma: turmaNormalizada,
    turmas,
    componentes,
    estudantes,
    fonte_digitalizada: fonteDigitalizada(ano, bimestre, turmaNormalizada),
    preenchimento_inicial:
      ano === 2026 && bimestre === 1 && registrosDaTurma.length === 0,
  };
}

export async function salvarConselho(
  ano: number,
  bimestre: number,
  turma: string,
  registrosRecebidos: any[],
  usuarioId: string
) {
  await garantirAbaConselhos();

  const turmaNormalizada = String(turma || '').trim().toUpperCase();
  const [usuarios, registros] = await Promise.all([getRows('usuarios'), getRows(ABA_CONSELHOS)]);
  const estudantesPermitidos = new Set(
    usuarios
      .filter(
        (usuario: any) =>
          String(usuario.perfil || '').trim().toLowerCase() === 'estudante' &&
          String(usuario.turma || '').trim().toUpperCase() === turmaNormalizada
      )
      .map((usuario: any) => String(usuario.id || '').trim())
  );
  const componentesPermitidos = new Set(
    componentesDaTurma(turmaNormalizada).map((componente) => componente.codigo)
  );
  const ids = registros.map((registro: any) => Number(registro.id)).filter(Number.isFinite);
  let proximoId = (ids.length ? Math.max(...ids) : 0) + 1;
  const agora = new Date().toISOString();
  const atualizacoes: Array<{ rowNumber: number; values: any[] }> = [];
  const inclusoes: any[][] = [];

  for (const recebido of Array.isArray(registrosRecebidos) ? registrosRecebidos : []) {
    const estudanteId = String(recebido.estudante_id || '').trim();
    if (!estudantesPermitidos.has(estudanteId)) continue;

    const marcacoes = parseMarcacoes(recebido.marcacoes || {}, componentesPermitidos);
    const situacao = calcularSituacaoPorMarcacoes(marcacoes);
    const frequencia = String(recebido.frequencia || '').trim().slice(0, 20);
    const observacao = String(recebido.observacao || '').trim().slice(0, 500);
    const indiceExistente = registros.findIndex(
      (registro: any) =>
        Number(registro.ano) === ano &&
        Number(registro.bimestre) === bimestre &&
        String(registro.turma || '').trim().toUpperCase() === turmaNormalizada &&
        String(registro.estudante_id || '').trim() === estudanteId
    );
    const id = indiceExistente >= 0 ? registros[indiceExistente].id : String(proximoId++);
    const valores = [
      id,
      String(ano),
      String(bimestre),
      turmaNormalizada,
      estudanteId,
      JSON.stringify(marcacoes),
      situacao,
      frequencia,
      observacao,
      usuarioId,
      agora,
    ];

    if (indiceExistente >= 0) {
      atualizacoes.push({ rowNumber: indiceExistente + 2, values: valores });
    } else {
      inclusoes.push(valores);
    }
  }

  await batchUpdateRows(ABA_CONSELHOS, atualizacoes);
  await appendRows(ABA_CONSELHOS, inclusoes);

  return { atualizados: atualizacoes.length, incluidos: inclusoes.length };
}
