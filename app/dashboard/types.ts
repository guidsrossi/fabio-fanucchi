export type DashboardModuleId = 'apoio' | 'tutorias' | 'relatorios' | 'gestao';

export type Usuario = {
  id: string;
  nome: string;
  login?: string;
  perfil: string;
  turma?: string;
  precisa_trocar_senha?: boolean;
};

export type Estudante = {
  id: string;
  nome: string;
  login?: string;
  turma: string;
  professor_id?: string;
};

export type Professor = {
  id: string;
  nome: string;
  login?: string;
};

export type Pergunta = {
  id: string;
  pergunta: string;
  tipo: string;
  ativa?: string;
};

export type Apoio = {
  id: string;
  estudante_id: string;
  estudante_nome: string;
  professor_id: string;
  professor_nome: string;
  turma: string;
  disciplina: string;
  data: string;
  feedback: string;
  status_validacao: string;
  observacao_estudante?: string;
  respostas?: Array<{
    pergunta: string;
    resposta: string;
  }>;
};

export type VinculosPorProfessor = Record<string, string[]>;

function normalizarTexto(valor: unknown) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function isGestao(perfil: string) {
  const perfilNormalizado = normalizarTexto(perfil);

  return perfilNormalizado === 'gestao' || perfilNormalizado === 'gestor';
}
