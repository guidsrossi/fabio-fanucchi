export type ModalidadeTutoria = 'tecnico' | 'humanas' | 'exatas';

const GERAIS_2 = [
  'Biologia', 'Educação Financeira', 'Educação Física', 'Esporte-Música-Arte',
  'Física', 'Geografia', 'História', 'Inglês', 'Língua Portuguesa', 'Matemática',
  'Práticas Experimentais', 'Projeto de Vida', 'Química', 'Redação e Leitura', 'Sociologia',
];
const GERAIS_3_TECNICO = [
  'Língua Portuguesa', 'Redação e Leitura', 'Língua Inglesa', 'Educação Física',
  'Matemática', 'Física', 'História',
];
const GERAIS_3 = [
  'Educação Física', 'Esporte-Música-Arte', 'Física', 'Práticas Experimentais',
  'História', 'Inglês', 'Língua Portuguesa', 'Matemática', 'Orientação de Português',
  'Orientação de Matemática', 'Projeto de Vida', 'Redação e Leitura',
];
const TECNICO_2 = [
  'Lógica e Linguagem de Programação', 'Rede de Computadores e Segurança',
  'Processos de Desenvolvimento', 'Carreira e Competências',
];
const TECNICO_3 = [
  'Banco de Dados e Computação', 'Ética e Responsabilidade', 'Aprendizagem de Máquina',
  'Matemática e Estatística', 'Análise Exploratória', 'Inteligência Artificial',
  'Projeto Multidisciplinar',
];
const HUMANAS_2 = ['Oratória', 'Liderança', 'Tecnologia e Robótica', 'Eletiva', 'OE Matemática', 'OE Português'];
const EXATAS_2 = ['Empreendedorismo', 'Programação', 'Tecnologia e Robótica', 'Eletiva', 'OE Matemática', 'OE Português'];
const HUMANAS_3 = ['Robótica', 'Aprofundamento de Geografia', 'Aprofundamento de Filosofia', 'Atualidades', 'Aprofundamento de Sociologia', 'Eletiva'];
const EXATAS_3 = ['Robótica', 'Aprofundamento de Biologia', 'Programação', 'Aprofundamento de Química', 'Empreendedorismo', 'Eletiva'];

export function modalidadeDaTurma(turmaRecebida: string): ModalidadeTutoria {
  const turma = String(turmaRecebida || '').replace(/\s/g, '').toUpperCase();
  if (['2A', '2D', '3A'].includes(turma)) return 'tecnico';
  if (['2B', '3B', '3C'].includes(turma)) return 'humanas';
  return 'exatas';
}

export function disciplinasDaTurma(turmaRecebida: string) {
  const turma = String(turmaRecebida || '').replace(/\s/g, '').toUpperCase();
  const terceiro = turma.startsWith('3');
  const modalidade = modalidadeDaTurma(turma);
  const gerais = terceiro ? (modalidade === 'tecnico' ? GERAIS_3_TECNICO : GERAIS_3) : GERAIS_2;
  const itinerario = modalidade === 'tecnico'
    ? (terceiro ? TECNICO_3 : TECNICO_2)
    : modalidade === 'humanas'
      ? (terceiro ? HUMANAS_3 : HUMANAS_2)
      : (terceiro ? EXATAS_3 : EXATAS_2);
  return { gerais, itinerario, modalidade };
}
