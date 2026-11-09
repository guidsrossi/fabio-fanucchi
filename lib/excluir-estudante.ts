import { batchUpdateCells, getRows } from '@/lib/sheets';
import { isEstudante, isGestao } from '@/lib/permissions';

export async function excluirEstudante(user: any, estudanteIdRecebido: unknown) {
  if (!user || !isGestao(user.perfil)) {
    return { success: false, error: 'Acesso negado', status: 403 };
  }

  const estudanteId = typeof estudanteIdRecebido === 'string' ? estudanteIdRecebido.trim() : '';
  if (!estudanteId) {
    return { success: false, error: 'Informe o estudante', status: 400 };
  }

  const usuarios = await getRows('usuarios');
  const indice = usuarios.findIndex((usuario: any) => String(usuario.id || '').trim() === estudanteId);
  const estudante = usuarios[indice];
  if (!estudante || (!isEstudante(estudante.perfil) && estudante.perfil !== 'estudante_excluido')) {
    return { success: false, error: 'Estudante não encontrado', status: 404 };
  }

  // O ID fica reservado e o histórico escolar é mantido. A conta deixa de ser
  // um estudante ativo e suas credenciais são removidas, sem deslocar linhas.
  // Repetir uma exclusão concluída não gera novas gravações.
  if (estudante.perfil === 'estudante_excluido') return { success: true };

  // Não ignorar erros de leitura: conta e vínculos devem ser alterados juntos.
  const vinculos = await getRows('professor_estudantes');
  const cells = [
    { sheetName: 'usuarios', rowNumber: indice + 2, columnNumber: 3, value: '' },
    { sheetName: 'usuarios', rowNumber: indice + 2, columnNumber: 4, value: '' },
    { sheetName: 'usuarios', rowNumber: indice + 2, columnNumber: 5, value: 'estudante_excluido' },
  ];
  vinculos.forEach((vinculo: any, index: number) => {
    if (String(vinculo.estudante_id || '').trim() === estudanteId) {
      cells.push({ sheetName: 'professor_estudantes', rowNumber: index + 2, columnNumber: 4, value: 'nao' });
    }
  });
  await batchUpdateCells(cells);
  return { success: true };
}
