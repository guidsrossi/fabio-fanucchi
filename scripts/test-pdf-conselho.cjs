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
const student = { id: '1', nome: 'Estudante teste', turma: '1A', marcacoes: {}, situacao: 'verde', frequencia: '95', notas: [], mencoes: [] };
function Pdf(options) {
  const doc = new jsPDF(options);
  doc.save = (name) => {
    assert.equal(name, 'conselho-2026-3b-todas-as-turmas.pdf');
    assert.ok(doc.output().startsWith('%PDF-'));
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
      { turma: '3A', componentes: [{ codigo: 'POR' }], estudantes: [{ ...student, notas: [{ disciplina: 'Português', nota: 8 }] }], notas_sem_cadastro: [] },
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
  console.log('OK: PDF do 3º bimestre, turma aberta sem notas, anexo de notas, consulta única e resposta vazia tratada.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
