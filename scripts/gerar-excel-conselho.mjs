import path from 'node:path';
import ExcelJS from 'exceljs';

const origem = process.argv[2];
const destino = process.argv[3];

if (!origem || !destino) {
  throw new Error('Uso: node scripts/gerar-excel-conselho.mjs <origem.xlsx> <destino.xlsx>');
}

const situacoesPorTurma = {
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

const codigoSituacao = {
  a: 'azul',
  r: 'rosa',
  v: 'verde',
  _: 'sem_classificacao',
};

function texto(valor) {
  return String(valor ?? '').trim();
}

function situacaoDoEstudante(turma, estudanteId) {
  const configuracao = situacoesPorTurma[turma];
  const indice = Number(estudanteId) - (configuracao?.primeiroId || 0);
  return codigoSituacao[configuracao?.codigos[indice]] || 'sem_classificacao';
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(origem);

const usuarios = workbook.getWorksheet('usuarios');
if (!usuarios) throw new Error('A aba usuarios não foi encontrada');

const cabecalhosUsuarios = {};
usuarios.getRow(1).eachCell((cell, column) => {
  cabecalhosUsuarios[texto(cell.value).toLowerCase()] = column;
});

for (const obrigatorio of ['id', 'nome', 'perfil', 'turma']) {
  if (!cabecalhosUsuarios[obrigatorio]) {
    throw new Error(`Coluna obrigatória ausente em usuarios: ${obrigatorio}`);
  }
}

const estudantes = [];
usuarios.eachRow((row, rowNumber) => {
  if (rowNumber === 1) return;
  if (texto(row.getCell(cabecalhosUsuarios.perfil).value).toLowerCase() !== 'estudante') return;

  const id = texto(row.getCell(cabecalhosUsuarios.id).value).replace(/\.0$/, '');
  const turma = texto(row.getCell(cabecalhosUsuarios.turma).value).toUpperCase();
  const nome = texto(row.getCell(cabecalhosUsuarios.nome).value);
  if (!id || !turma || !nome || !situacoesPorTurma[turma]) return;

  estudantes.push({ id, nome, turma });
});

const abaExistente = workbook.getWorksheet('conselhos_classe');
if (abaExistente) workbook.removeWorksheet(abaExistente.id);

const conselho = workbook.addWorksheet('conselhos_classe', {
  views: [{ state: 'frozen', ySplit: 1 }],
  properties: { tabColor: { argb: 'FF2563EB' } },
});

conselho.columns = [
  { header: 'id', key: 'id', width: 10 },
  { header: 'ano', key: 'ano', width: 10 },
  { header: 'bimestre', key: 'bimestre', width: 12 },
  { header: 'turma', key: 'turma', width: 10 },
  { header: 'estudante_id', key: 'estudante_id', width: 15 },
  { header: 'marcacoes_json', key: 'marcacoes_json', width: 25 },
  { header: 'situacao', key: 'situacao', width: 22 },
  { header: 'frequencia', key: 'frequencia', width: 14 },
  { header: 'observacao', key: 'observacao', width: 62 },
  { header: 'atualizado_por', key: 'atualizado_por', width: 18 },
  { header: 'atualizado_em', key: 'atualizado_em', width: 24 },
];

const cabecalho = conselho.getRow(1);
cabecalho.height = 24;
cabecalho.font = { bold: true, color: { argb: 'FFFFFFFF' } };
cabecalho.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
cabecalho.alignment = { vertical: 'middle', horizontal: 'center' };
cabecalho.eachCell((cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF1E293B' } },
    bottom: { style: 'thin', color: { argb: 'FF1E293B' } },
    left: { style: 'thin', color: { argb: 'FF1E293B' } },
    right: { style: 'thin', color: { argb: 'FF1E293B' } },
  };
});

const cores = {
  azul: 'FFA5F3FC',
  rosa: 'FFFBCFE8',
  verde: 'FFBBF7D0',
  sem_classificacao: 'FFFFFFFF',
};

estudantes
  .sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'))
  .forEach((estudante, index) => {
    const situacao = situacaoDoEstudante(estudante.turma, estudante.id);
    const row = conselho.addRow({
      id: String(index + 1),
      ano: '2026',
      bimestre: '1',
      turma: estudante.turma,
      estudante_id: estudante.id,
      marcacoes_json: '{}',
      situacao,
      frequencia: '',
      observacao: 'Pré-carga baseada na ficha digitalizada; revisar as marcações manuscritas A/E/D/T.',
      atualizado_por: '',
      atualizado_em: '',
    });

    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cores[situacao] } };
    row.alignment = { vertical: 'middle', wrapText: true };
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'hair', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'hair', color: { argb: 'FF94A3B8' } },
        left: { style: 'hair', color: { argb: 'FF94A3B8' } },
        right: { style: 'hair', color: { argb: 'FF94A3B8' } },
      };
    });
  });

conselho.autoFilter = { from: 'A1', to: 'K1' };

const legendaExistente = workbook.getWorksheet('legenda_conselho');
if (legendaExistente) workbook.removeWorksheet(legendaExistente.id);
const legenda = workbook.addWorksheet('legenda_conselho');
legenda.columns = [{ width: 25 }, { width: 70 }];
[
  ['Campo/código', 'Descrição'],
  ['A', 'Assiduidade'],
  ['E', 'Engajamento'],
  ['D', 'Dificuldade'],
  ['T', 'Todos'],
  ['azul', 'Notas vermelhas'],
  ['rosa', 'Notas vermelhas + faltas'],
  ['verde', 'Notas satisfatórias + frequência acima de 80%'],
  ['marcacoes_json', 'Objeto JSON com uma marcação por componente. Exemplo: {"MAT":"D","POR":"A"}'],
].forEach((valores) => legenda.addRow(valores));
legenda.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
legenda.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
legenda.getColumn(2).alignment = { wrapText: true, vertical: 'top' };

await workbook.xlsx.writeFile(destino);

console.log(JSON.stringify({
  origem: path.resolve(origem),
  destino: path.resolve(destino),
  estudantes: estudantes.length,
  turmas: [...new Set(estudantes.map((estudante) => estudante.turma))],
}));
