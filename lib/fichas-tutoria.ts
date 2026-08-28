import { appendRow, ensureSheetWithHeaders, getRows, updateRow } from '@/lib/sheets';
import { estaAtivo, isGestao, isProfessor } from '@/lib/permissions';
import { ABA_TUTORIAS_MENSAIS, TUTORIAS_MENSAIS_HEADERS, quantidadeSegura } from '@/lib/tutorias';

export const ABA_FICHAS_TUTORIA = 'fichas_tutoria';
export const FICHAS_TUTORIA_HEADERS = [
  'id',
  'data',
  'mes',
  'estudante_id',
  'professor_id',
  'turma',
  'relato',
  'criado_em',
  'atualizado_em',
];

function dataValida(valor: unknown) {
  const data = String(valor || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(data)) return '';
  const [ano, mes, dia] = data.split('-').map(Number);
  const instancia = new Date(Date.UTC(ano, mes - 1, dia));
  return instancia.getUTCFullYear() === ano && instancia.getUTCMonth() === mes - 1 && instancia.getUTCDate() === dia
    ? data
    : '';
}

async function dadosBase() {
  await Promise.all([
    ensureSheetWithHeaders(ABA_FICHAS_TUTORIA, FICHAS_TUTORIA_HEADERS),
    ensureSheetWithHeaders(ABA_TUTORIAS_MENSAIS, TUTORIAS_MENSAIS_HEADERS),
  ]);
  const [fichas, usuarios, vinculos, tutorias] = await Promise.all([
    getRows(ABA_FICHAS_TUTORIA),
    getRows('usuarios'),
    getRows('professor_estudantes').catch(() => []),
    getRows(ABA_TUTORIAS_MENSAIS),
  ]);
  return { fichas, usuarios, vinculos, tutorias };
}

function estudanteIdsDoProfessor(vinculos: any[], professorId: string) {
  return vinculos
    .filter(
      (vinculo: any) =>
        String(vinculo.professor_id || '').trim() === professorId && estaAtivo(vinculo.ativo)
    )
    .map((vinculo: any) => String(vinculo.estudante_id || '').trim());
}

function proximoId(registros: any[]) {
  const ids = registros.map((item: any) => Number(item.id)).filter(Number.isFinite);
  return String((ids.length ? Math.max(...ids) : 0) + 1);
}

function hidratarFicha(ficha: any, usuariosPorId: Record<string, any>) {
  const estudanteId = String(ficha.estudante_id || '').trim();
  const professorId = String(ficha.professor_id || '').trim();
  return {
    id: String(ficha.id || '').trim(),
    data: String(ficha.data || '').trim(),
    mes: String(ficha.mes || ficha.data || '').slice(0, 7),
    estudante_id: estudanteId,
    estudante_nome: usuariosPorId[estudanteId]?.nome || 'Estudante não encontrado',
    professor_id: professorId,
    professor_nome: usuariosPorId[professorId]?.nome || 'Professor não encontrado',
    turma: ficha.turma || usuariosPorId[estudanteId]?.turma || '',
    relato: ficha.relato || '',
    criado_em: ficha.criado_em || '',
    atualizado_em: ficha.atualizado_em || '',
  };
}

async function sincronizarQuantidade(
  professorId: string,
  estudanteId: string,
  mes: string,
  fichas: any[],
  tutorias: any[],
  turma: string
) {
  if (!mes) return;
  const quantidade = fichas.filter(
    (ficha: any) =>
      String(ficha.professor_id || '').trim() === professorId &&
      String(ficha.estudante_id || '').trim() === estudanteId &&
      String(ficha.mes || ficha.data || '').slice(0, 7) === mes
  ).length;
  const indice = tutorias.findIndex(
    (registro: any) =>
      String(registro.professor_id || '').trim() === professorId &&
      String(registro.estudante_id || '').trim() === estudanteId &&
      String(registro.mes || '').slice(0, 7) === mes
  );
  const agora = new Date().toISOString();
  const valores = [
    indice >= 0 ? tutorias[indice].id : proximoId(tutorias),
    mes,
    estudanteId,
    professorId,
    turma,
    String(quantidadeSegura(quantidade)),
    'Quantidade calculada automaticamente pelas fichas de tutoria',
    agora,
  ];

  if (indice >= 0) {
    await updateRow(ABA_TUTORIAS_MENSAIS, indice + 2, valores);
    tutorias[indice] = Object.fromEntries(TUTORIAS_MENSAIS_HEADERS.map((header, i) => [header, valores[i]]));
  } else {
    await appendRow(ABA_TUTORIAS_MENSAIS, valores);
    tutorias.push(Object.fromEntries(TUTORIAS_MENSAIS_HEADERS.map((header, i) => [header, valores[i]])));
  }
}

export async function listarFichas(user: any, mesRecebido = '', estudanteFiltro = '') {
  const { fichas, usuarios, vinculos } = await dadosBase();
  const usuarioId = String(user.id || '').trim();
  const gestao = isGestao(user.perfil);
  const permitidos = gestao ? null : estudanteIdsDoProfessor(vinculos, usuarioId);
  const usuariosPorId = Object.fromEntries(
    usuarios.map((usuario: any) => [String(usuario.id || '').trim(), usuario])
  );
  const estudantes = usuarios
    .filter((usuario: any) => usuario.perfil === 'estudante')
    .filter((estudante: any) => gestao || permitidos?.includes(String(estudante.id || '').trim()))
    .map((estudante: any) => ({ id: estudante.id, nome: estudante.nome, turma: estudante.turma }))
    .sort((a: any, b: any) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const professores = gestao
    ? usuarios
        .filter((usuario: any) => isProfessor(usuario.perfil))
        .map((professor: any) => ({ id: professor.id, nome: professor.nome }))
    : [];
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(mesRecebido) ? mesRecebido : '';
  const registros = fichas
    .filter((ficha: any) => !mes || String(ficha.mes || ficha.data || '').slice(0, 7) === mes)
    .filter(
      (ficha: any) =>
        !estudanteFiltro || String(ficha.estudante_id || '').trim() === estudanteFiltro
    )
    .filter((ficha: any) =>
      gestao
        ? true
        : String(ficha.professor_id || '').trim() === usuarioId &&
          permitidos?.includes(String(ficha.estudante_id || '').trim())
    )
    .map((ficha: any) => hidratarFicha(ficha, usuariosPorId))
    .sort((a: any, b: any) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id));

  return { fichas: registros, estudantes, professores, podeEditar: !gestao && isProfessor(user.perfil) };
}

export async function criarFicha(user: any, dados: any) {
  if (!isProfessor(user.perfil)) return { success: false, error: 'Acesso negado' };
  const base = await dadosBase();
  const professorId = String(user.id || '').trim();
  const estudanteId = String(dados.estudante_id || '').trim();
  const data = dataValida(dados.data);
  const relato = String(dados.relato || '').trim();
  const permitidos = estudanteIdsDoProfessor(base.vinculos, professorId);
  const estudante = base.usuarios.find(
    (usuario: any) => usuario.perfil === 'estudante' && String(usuario.id || '').trim() === estudanteId
  );

  if (!permitidos.includes(estudanteId) || !estudante) {
    return { success: false, error: 'O estudante não está vinculado a este professor' };
  }
  if (!data) return { success: false, error: 'Informe uma data válida' };
  if (!relato) return { success: false, error: 'Descreva o que foi conversado durante a tutoria' };

  const agora = new Date().toISOString();
  const valores = [
    proximoId(base.fichas), data, data.slice(0, 7), estudanteId, professorId,
    estudante.turma || '', relato, agora, agora,
  ];
  await appendRow(ABA_FICHAS_TUTORIA, valores);
  const novaFicha = Object.fromEntries(FICHAS_TUTORIA_HEADERS.map((header, i) => [header, valores[i]]));
  base.fichas.push(novaFicha);
  await sincronizarQuantidade(professorId, estudanteId, data.slice(0, 7), base.fichas, base.tutorias, estudante.turma || '');
  return { success: true, ficha: novaFicha };
}

export async function editarFicha(user: any, dados: any) {
  if (!isProfessor(user.perfil)) return { success: false, error: 'Acesso negado' };
  const base = await dadosBase();
  const professorId = String(user.id || '').trim();
  const fichaId = String(dados.id || '').trim();
  const indice = base.fichas.findIndex((ficha: any) => String(ficha.id || '').trim() === fichaId);
  if (indice < 0) return { success: false, error: 'Ficha não encontrada' };

  const atual = base.fichas[indice];
  const estudanteId = String(atual.estudante_id || '').trim();
  const permitidos = estudanteIdsDoProfessor(base.vinculos, professorId);
  if (String(atual.professor_id || '').trim() !== professorId || !permitidos.includes(estudanteId)) {
    return { success: false, error: 'Você não pode editar esta ficha' };
  }

  const data = dataValida(dados.data);
  const relato = String(dados.relato || '').trim();
  if (!data) return { success: false, error: 'Informe uma data válida' };
  if (!relato) return { success: false, error: 'Descreva o que foi conversado durante a tutoria' };

  const mesAnterior = String(atual.mes || atual.data || '').slice(0, 7);
  const turma = atual.turma || '';
  const valores = [
    atual.id, data, data.slice(0, 7), estudanteId, professorId, turma, relato,
    atual.criado_em || new Date().toISOString(), new Date().toISOString(),
  ];
  await updateRow(ABA_FICHAS_TUTORIA, indice + 2, valores);
  base.fichas[indice] = Object.fromEntries(FICHAS_TUTORIA_HEADERS.map((header, i) => [header, valores[i]]));
  await sincronizarQuantidade(professorId, estudanteId, mesAnterior, base.fichas, base.tutorias, turma);
  if (data.slice(0, 7) !== mesAnterior) {
    await sincronizarQuantidade(professorId, estudanteId, data.slice(0, 7), base.fichas, base.tutorias, turma);
  }
  return { success: true };
}
