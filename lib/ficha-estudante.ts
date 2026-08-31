import { appendRow, ensureSheetWithHeaders, getRows, updateRow } from '@/lib/sheets';
import { estaAtivo, isGestao, isProfessor } from '@/lib/permissions';
import dadosCadastrais from '@/data/dados-cadastrais-estudantes.json';

export const ABA_FICHA_ESTUDANTE = 'ficha_tutoria_estudante';
const HEADERS = ['estudante_id', 'dados_json', 'atualizado_por', 'atualizado_em'];

async function base() {
  await ensureSheetWithHeaders(ABA_FICHA_ESTUDANTE, HEADERS);
  const [fichas, usuarios, vinculos] = await Promise.all([
    getRows(ABA_FICHA_ESTUDANTE),
    getRows('usuarios'),
    getRows('professor_estudantes').catch(() => []),
  ]);
  return { fichas, usuarios, vinculos };
}

function temVinculo(vinculos: any[], professorId: string, estudanteId: string) {
  return vinculos.some((vinculo: any) =>
    String(vinculo.professor_id || '').trim() === professorId &&
    String(vinculo.estudante_id || '').trim() === estudanteId &&
    estaAtivo(vinculo.ativo)
  );
}

function lerJson(valor: unknown) {
  try {
    const dados = JSON.parse(String(valor || '{}'));
    return dados && typeof dados === 'object' && !Array.isArray(dados) ? dados : {};
  } catch {
    return {};
  }
}

function chaveCadastro(nome: unknown, turma: unknown) {
  const nomeNormalizado = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return `${String(turma || '').trim().toUpperCase()}|${nomeNormalizado}`;
}

function limparDados(valor: unknown) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  const json = JSON.stringify(valor);
  if (json.length > 45_000) throw new Error('A ficha ultrapassou o limite de dados permitido');
  return JSON.parse(json);
}

export async function obterFichaEstudante(user: any, estudanteIdRecebido: string) {
  const dadosBase = await base();
  const estudanteId = String(estudanteIdRecebido || '').trim();
  const usuarioId = String(user.id || '').trim();
  const estudante = dadosBase.usuarios.find((item: any) =>
    item.perfil === 'estudante' && String(item.id || '').trim() === estudanteId
  );
  if (!estudante) return { success: false, error: 'Estudante não encontrado' };
  if (!isGestao(user.perfil) && !temVinculo(dadosBase.vinculos, usuarioId, estudanteId)) {
    return { success: false, error: 'Você não pode acessar a ficha deste estudante' };
  }
  const registro = dadosBase.fichas.find((item: any) => String(item.estudante_id || '').trim() === estudanteId);
  const cadastro: any = dadosCadastrais.find((item: any) =>
    chaveCadastro(item.nome, item.turma) === chaveCadastro(estudante.nome, estudante.turma)
  );
  return {
    success: true,
    estudante: {
      id: estudante.id,
      nome: estudante.nome,
      turma: estudante.turma || '',
      ra: String(estudante.ra || cadastro?.ra || '').trim(),
      data_nascimento: String(estudante.data_nascimento || cadastro?.data_nascimento || '').trim(),
    },
    ficha: lerJson(registro?.dados_json),
    atualizado_em: registro?.atualizado_em || '',
    podeEditar: !isGestao(user.perfil) && isProfessor(user.perfil),
  };
}

export async function salvarFichaEstudante(user: any, estudanteIdRecebido: string, dadosRecebidos: unknown) {
  if (!isProfessor(user.perfil) || isGestao(user.perfil)) return { success: false, error: 'Acesso negado' };
  const dadosBase = await base();
  const estudanteId = String(estudanteIdRecebido || '').trim();
  const professorId = String(user.id || '').trim();
  const estudanteExiste = dadosBase.usuarios.some((item: any) =>
    item.perfil === 'estudante' && String(item.id || '').trim() === estudanteId
  );
  if (!estudanteExiste || !temVinculo(dadosBase.vinculos, professorId, estudanteId)) {
    return { success: false, error: 'O estudante não está vinculado a este professor' };
  }
  const dados = limparDados(dadosRecebidos);
  const agora = new Date().toISOString();
  const valores = [estudanteId, JSON.stringify(dados), professorId, agora];
  const indice = dadosBase.fichas.findIndex((item: any) => String(item.estudante_id || '').trim() === estudanteId);
  if (indice >= 0) await updateRow(ABA_FICHA_ESTUDANTE, indice + 2, valores);
  else await appendRow(ABA_FICHA_ESTUDANTE, valores);
  return { success: true, atualizado_em: agora };
}
