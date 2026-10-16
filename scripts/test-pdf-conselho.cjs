const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;
const source = fs.readFileSync('app/dashboard/components/ConselhoClasseModule.tsx', 'utf8');
const start = source.indexOf('  async function gerarPdf()');
const end = source.indexOf('\n  return (', start);
const code = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
let saved = false;
let requested = 0;
let failure = '';
const student = { id: '1', nome: 'Estudante teste', turma: '1A', marcacoes: { POR: 'D' }, situacao: 'verde', frequencia: '95', observacao: 'Precisa de acompanhamento.', notas: [], mencoes: [] };
function Pdf(options) {
  const doc = new jsPDF(options);
  doc.save = (name) => {
    assert.equal(name, 'conselho-2026-3b-todas-as-turmas.pdf');
    assert.equal(doc.getNumberOfPages(), 2, 'Deve gerar apenas a tabela de cada turma, sem anexos de notas');
    const output = doc.output();
    assert.ok(output.startsWith('%PDF-'));
    assert.ok(output.includes('NOME DO ALUNO'));
    assert.ok(output.includes('FREQ.'));
    assert.ok(output.includes('Observação'));
    assert.ok(output.includes('Precisa de'));
    assert.ok(output.includes('acompanhamento.'));
    assert.ok(output.includes('(D)'));
    assert.ok(!output.includes('Nota /'), 'O PDF nao deve conter a tabela de notas');
    saved = true;
  };
  return doc;
}
const context = vm.createContext({
  jsPDF: Pdf, autoTable, URLSearchParams, Error,
  ano: 2026, bimestre: 3, turma: '1A',
  componentes: [{ codigo: 'POR', nome: 'Português' }], estudantes: [student], notasSemCadastro: [],
  corPdf: () => [187, 247, 208], situacaoDaLinha: (item) => item.situacao,
  runWithLoading: async (_, fn) => fn(), setErro: (value) => { failure = value; }, setMensagem: () => {},
  fetch: async (url) => {
    requested++;
    assert.ok(url.includes('todas=1'));
    return { ok: true, json: async () => ({ success: true, conselhos: [
      { turma: '1A', componentes: [], estudantes: [], notas_sem_cadastro: [] },
      { turma: '3A', componentes: [{ codigo: 'POR' }], estudantes: [{ ...student, notas: [{ disciplina: 'Português', nota: 8 }] }], notas_sem_cadastro: [{ nome: 'Aluno sem cadastro', notas: [{ disciplina: 'Portugues', nota: 7 }], mencoes: [], frequencia: '90%', frequencia_anual: '92%' }] },
    ] }) };
  },
});
vm.runInContext(code, context);
(async () => {
  await context.gerarPdf();
  assert.equal(failure, '');
  assert.equal(saved, true);
  assert.equal(requested, 1);
  saved = false;
  context.fetch = async () => ({ ok: false, json: async () => { throw new SyntaxError('Unexpected end of JSON input'); } });
  await context.gerarPdf();
  assert.equal(saved, false);
  assert.ok(failure.includes('Não foi possível carregar as turmas'));
  console.log('OK: apenas tabelas por turma, sem anexos de notas, consulta unica e erro de resposta tratados.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
