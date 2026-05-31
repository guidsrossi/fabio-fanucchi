import { appendRow, ensureSheetWithHeaders, getRows, updateRow } from '@/lib/sheets';
import { estaAtivo } from '@/lib/permissions';

export const ABA_TUTORIAS_MENSAIS = 'tutorias_mensais';
const ABA_VINCULOS = 'professor_estudantes';

export const TUTORIAS_MENSAIS_HEADERS = [
  'id',
  'mes',
  'estudante_id',
  'professor_id',
  'turma',
  'quantidade',
  'observacao',
  'atualizado_em',
];

export type FiltrosRelatorioTutorias = {
  mes: string;
  turma?: string;
  professorId?: string;
  estudanteId?: string;
};

export function mesAtualReferencia() {
  return new Date().toISOString().slice(0, 7);
}

export function normalizarMes(valor: unknown) {
  const mes = String(valor || '').trim();

  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return mes;

  return '';
}

export function quantidadeSegura(valor: unknown) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) return 0;

  return Math.min(999, Math.round(numero));
}

export async function garantirAbaTutoriasMensais() {
  await ensureSheetWithHeaders(ABA_TUTORIAS_MENSAIS, TUTORIAS_MENSAIS_HEADERS);
}

async function getVinculos() {
  try {
    return await getRows(ABA_VINCULOS);
  } catch {
    return [];
  }
}

async function getRegistrosTutorias() {
  await garantirAbaTutoriasMensais();
  return getRows(ABA_TUTORIAS_MENSAIS);
}

export async function getEstudantesDoProfessor(professorId: string) {
  const vinculos = await getVinculos();
  const usuarios = await getRows('usuarios');
  const estudantes = usuarios.filter((usuario: any) => usuario.perfil === 'estudante');
  const estudantesIds = vinculos
    .filter((vinculo: any) => vinculo.professor_id === professorId && estaAtivo(vinculo.ativo))
    .map((vinculo: any) => String(vinculo.estudante_id || '').trim())
    .filter(Boolean);

  return estudantes
    .filter((estudante: any) => estudantesIds.includes(String(estudante.id || '').trim()))
    .sort((a: any, b: any) => {
      const turma = String(a.turma || '').localeCompare(String(b.turma || ''));

      if (turma !== 0) return turma;

      return String(a.nome || '').localeCompare(String(b.nome || ''));
    });
}

function criarMapaUsuarios(usuarios: any[]) {
  return usuarios.reduce((acc: any, usuario: any) => {
    acc[String(usuario.id || '').trim()] = usuario;
    return acc;
  }, {});
}

function criarMapaEstudantes(estudantes: any[]) {
  return estudantes.reduce((acc: any, estudante: any) => {
    acc[String(estudante.id || '').trim()] = estudante;
    return acc;
  }, {});
}

function criarMapaProfessorAtual(vinculos: any[]) {
  return vinculos.reduce((acc: any, vinculo: any) => {
    if (estaAtivo(vinculo.ativo)) {
      acc[String(vinculo.estudante_id || '').trim()] = String(vinculo.professor_id || '').trim();
    }

    return acc;
  }, {});
}

function hidratarRegistro(registro: any, estudantesPorId: any, usuariosPorId: any) {
  const estudante = estudantesPorId[String(registro.estudante_id || '').trim()];
  const professor = usuariosPorId[String(registro.professor_id || '').trim()];

  return {
    id: registro.id,
    mes: registro.mes,
    estudante_id: registro.estudante_id,
    estudante_nome: estudante?.nome || 'Estudante nao encontrado',
    professor_id: registro.professor_id,
    professor_nome: professor?.nome || 'Professor nao encontrado',
    turma: registro.turma || estudante?.turma || '',
    quantidade: quantidadeSegura(registro.quantidade),
    observacao: registro.observacao || '',
    atualizado_em: registro.atualizado_em || '',
  };
}

export async function listarTutoriasDoProfessor(professorId: string, mes: string) {
  const mesReferencia = normalizarMes(mes) || mesAtualReferencia();
  const [estudantes, registros] = await Promise.all([
    getEstudantesDoProfessor(professorId),
    getRegistrosTutorias(),
  ]);

  const registrosDoMes = registros.filter(
    (registro: any) => registro.mes === mesReferencia && registro.professor_id === professorId
  );

  return estudantes.map((estudante: any) => {
    const registrosDoEstudante = registrosDoMes.filter(
      (registro: any) => String(registro.estudante_id || '').trim() === String(estudante.id || '').trim()
    );

    return {
      id: estudante.id,
      nome: estudante.nome,
      turma: estudante.turma,
      registro_id: registrosDoEstudante[0]?.id || '',
      quantidade: registrosDoEstudante.reduce(
        (total: number, registro: any) => total + quantidadeSegura(registro.quantidade),
        0
      ),
      observacao: registrosDoEstudante[0]?.observacao || '',
    };
  });
}

export async function salvarTutoriasDoProfessor(
  professorId: string,
  mes: string,
  registrosRecebidos: any[]
) {
  const mesReferencia = normalizarMes(mes);

  if (!mesReferencia) {
    return {
      success: false,
      error: 'Informe um mes valido no formato AAAA-MM',
    };
  }

  const estudantes = await getEstudantesDoProfessor(professorId);
  const estudantesPorId = criarMapaEstudantes(estudantes);
  const estudantesPermitidos = estudantes.map((estudante: any) => String(estudante.id || '').trim());
  const registrosValidos = Array.isArray(registrosRecebidos) ? registrosRecebidos : [];

  const tutorias = await getRegistrosTutorias();
  const ids = tutorias
    .map((registro: any) => Number(registro.id))
    .filter((id) => Number.isFinite(id));
  let proximoId = (ids.length ? Math.max(...ids) : 0) + 1;

  for (const registroRecebido of registrosValidos) {
    const estudanteId = String(registroRecebido.estudante_id || '').trim();

    if (!estudantesPermitidos.includes(estudanteId)) {
      return {
        success: false,
        error: 'Um dos estudantes enviados nao esta vinculado ao professor',
      };
    }

    const estudante = estudantesPorId[estudanteId];
    const quantidade = quantidadeSegura(registroRecebido.quantidade);
    const observacao = String(registroRecebido.observacao || '').trim();
    const atualizadoEm = new Date().toISOString();

    const indicesExistentes = tutorias
      .map((registro: any, index: number) => ({ registro, index }))
      .filter(
        ({ registro }: any) =>
          registro.mes === mesReferencia &&
          registro.professor_id === professorId &&
          String(registro.estudante_id || '').trim() === estudanteId
      )
      .map(({ index }: any) => index);

    const valores = [
      indicesExistentes.length ? tutorias[indicesExistentes[0]].id : String(proximoId),
      mesReferencia,
      estudanteId,
      professorId,
      estudante.turma || '',
      String(quantidade),
      observacao,
      atualizadoEm,
    ];

    if (indicesExistentes.length) {
      await updateRow(ABA_TUTORIAS_MENSAIS, indicesExistentes[0] + 2, valores);

      for (const indiceDuplicado of indicesExistentes.slice(1)) {
        const duplicado = tutorias[indiceDuplicado];
        await updateRow(ABA_TUTORIAS_MENSAIS, indiceDuplicado + 2, [
          duplicado.id,
          duplicado.mes,
          duplicado.estudante_id,
          duplicado.professor_id,
          duplicado.turma,
          '0',
          duplicado.observacao || '',
          atualizadoEm,
        ]);
      }
    } else {
      await appendRow(ABA_TUTORIAS_MENSAIS, valores);
      proximoId += 1;
    }
  }

  return { success: true };
}

function filtrarRegistroPorContexto(registro: any, filtros: FiltrosRelatorioTutorias, estudantesPorId: any) {
  const estudante = estudantesPorId[String(registro.estudante_id || '').trim()];

  if (filtros.turma && String(registro.turma || estudante?.turma || '') !== filtros.turma) return false;
  if (filtros.professorId && registro.professor_id !== filtros.professorId) return false;
  if (filtros.estudanteId && registro.estudante_id !== filtros.estudanteId) return false;

  return true;
}

export async function gerarRelatorioTutorias(filtros: FiltrosRelatorioTutorias) {
  const mesReferencia = normalizarMes(filtros.mes) || mesAtualReferencia();
  const [registros, usuarios, vinculos] = await Promise.all([
    getRegistrosTutorias(),
    getRows('usuarios'),
    getVinculos(),
  ]);
  const estudantes = usuarios.filter((usuario: any) => usuario.perfil === 'estudante');
  const estudantesPorId = criarMapaEstudantes(estudantes);
  const usuariosPorId = criarMapaUsuarios(usuarios);
  const professorAtualPorEstudante = criarMapaProfessorAtual(vinculos);
  const professores = usuarios
    .filter((usuario: any) => usuario.perfil === 'professor')
    .map((professor: any) => ({
      id: professor.id,
      nome: professor.nome,
      login: professor.login || professor.nome,
    }));

  const registrosFiltrados = registros
    .filter((registro: any) => registro.mes === mesReferencia)
    .filter((registro: any) => filtrarRegistroPorContexto(registro, filtros, estudantesPorId))
    .map((registro: any) => hidratarRegistro(registro, estudantesPorId, usuariosPorId));

  const totalPorEstudante = registrosFiltrados.reduce((acc: any, registro: any) => {
    acc[registro.estudante_id] = (acc[registro.estudante_id] || 0) + registro.quantidade;
    return acc;
  }, {});

  const estudantesConsiderados = estudantes.filter((estudante: any) => {
    const estudanteId = String(estudante.id || '').trim();
    const professorAtual = professorAtualPorEstudante[estudanteId] || '';
    const teveRegistroComProfessor = registrosFiltrados.some(
      (registro: any) => registro.estudante_id === estudanteId
    );

    if (filtros.turma && String(estudante.turma || '') !== filtros.turma) return false;
    if (filtros.estudanteId && estudanteId !== filtros.estudanteId) return false;
    if (filtros.professorId && professorAtual !== filtros.professorId && !teveRegistroComProfessor) return false;

    return true;
  });

  const estudantesResumo = estudantesConsiderados.map((estudante: any) => {
    const estudanteId = String(estudante.id || '').trim();
    const professorId =
      filtros.professorId ||
      registrosFiltrados.find((registro: any) => registro.estudante_id === estudanteId)?.professor_id ||
      professorAtualPorEstudante[estudanteId] ||
      '';

    return {
      id: estudanteId,
      nome: estudante.nome,
      turma: estudante.turma,
      professor_id: professorId,
      professor_nome: usuariosPorId[professorId]?.nome || 'Sem professor vinculado',
      quantidade: totalPorEstudante[estudanteId] || 0,
    };
  });

  const totalGeral = estudantesResumo.reduce((total: number, estudante: any) => total + estudante.quantidade, 0);
  const mediaPorEstudante = estudantesResumo.length ? totalGeral / estudantesResumo.length : 0;
  const limiteMuitasTutorias = 3;

  const rankingMaior = [...estudantesResumo]
    .sort((a: any, b: any) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome))
    .slice(0, 5);
  const rankingMenor = [...estudantesResumo]
    .sort((a: any, b: any) => a.quantidade - b.quantidade || a.nome.localeCompare(b.nome))
    .slice(0, 5);

  const comparativoMeses = registros
    .filter((registro: any) => filtrarRegistroPorContexto(registro, filtros, estudantesPorId))
    .reduce((acc: any, registro: any) => {
      const mes = registro.mes || 'Sem mes';
      acc[mes] = (acc[mes] || 0) + quantidadeSegura(registro.quantidade);
      return acc;
    }, {});

  if (!comparativoMeses[mesReferencia]) {
    comparativoMeses[mesReferencia] = totalGeral;
  }

  const porTurma = estudantesResumo.reduce((acc: any, estudante: any) => {
    const turma = estudante.turma || 'Sem turma';
    acc[turma] = (acc[turma] || 0) + estudante.quantidade;
    return acc;
  }, {});

  const porProfessor = registrosFiltrados.reduce((acc: any, registro: any) => {
    const professor = registro.professor_nome || 'Professor nao encontrado';
    acc[professor] = (acc[professor] || 0) + registro.quantidade;
    return acc;
  }, {});

  return {
    mes: mesReferencia,
    filtros: {
      turmas: Array.from(new Set(estudantes.map((estudante: any) => estudante.turma).filter(Boolean))).sort(),
      professores,
      estudantes: estudantes
        .map((estudante: any) => ({
          id: estudante.id,
          nome: estudante.nome,
          turma: estudante.turma,
        }))
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome)),
      meses: Array.from(new Set([...registros.map((registro: any) => registro.mes).filter(Boolean), mesReferencia]))
        .sort()
        .reverse(),
    },
    indicadores: {
      totalGeral,
      mediaPorEstudante,
      estudantesNoFiltro: estudantesResumo.length,
      comPoucasTutorias: estudantesResumo.filter((estudante: any) => estudante.quantidade === 0).length,
      comMuitasTutorias: estudantesResumo.filter(
        (estudante: any) => estudante.quantidade >= limiteMuitasTutorias
      ).length,
      limiteMuitasTutorias,
    },
    rankingMaior,
    rankingMenor,
    destaques: {
      poucas: estudantesResumo.filter((estudante: any) => estudante.quantidade === 0).slice(0, 8),
      muitas: estudantesResumo
        .filter((estudante: any) => estudante.quantidade >= limiteMuitasTutorias)
        .slice(0, 8),
    },
    graficos: {
      comparativoMeses: Object.entries(comparativoMeses)
        .map(([mes, total]) => ({ mes, total: Number(total) || 0 }))
        .sort((a: any, b: any) => a.mes.localeCompare(b.mes))
        .slice(-8),
      porTurma: Object.entries(porTurma).map(([turma, total]) => ({
        turma,
        total: Number(total) || 0,
      })),
      porProfessor: Object.entries(porProfessor).map(([professor, total]) => ({
        professor,
        total: Number(total) || 0,
      })),
    },
    registros: registrosFiltrados,
    estudantes: estudantesResumo,
  };
}
