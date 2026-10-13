// Testa a exclusão em memória, sem conectar ao banco ou apagar registros reais.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function carregarModulo(arquivo, imports) {
  const code = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => {
    if (!(name in imports)) throw new Error(`Import inesperado: ${name}`);
    return imports[name];
  } }, { filename: arquivo });
  return module.exports;
}

const permissions = carregarModulo('lib/permissions.ts', {});
const tutorHeaders = ['id', 'mes', 'estudante_id', 'professor_id', 'turma', 'quantidade', 'observacao', 'atualizado_em'];
const professor = { id: 'p1', perfil: 'professor' };

function ambiente() {
  let writes = 0;
  let falharContagem = false;
  const ficha = (id, professor_id = 'p1', estudante_id = 's1', mes = '2026-10') => ({
    id, professor_id, estudante_id, mes, data: `${mes}-10`, turma: '1A', relato: 'Registro de teste',
    criado_em: '2026-10-10T12:00:00Z', atualizado_em: '', status_confirmacao: 'registrada', confirmado_em: '',
  });
  const banco = {
    fichas_tutoria: [ficha('1'), ficha('2'), ficha('3', 'p2', 's2'), ficha('4', 'p1', 's1', '2026-09')],
    usuarios: [{ id: 's1', nome: 'Estudante teste', perfil: 'estudante', turma: '1A' }],
    professor_estudantes: [{ professor_id: 'p1', estudante_id: 's1', ativo: 'SIM' }],
    tutorias_mensais: [{ id: '1', professor_id: 'p1', estudante_id: 's1', mes: '2026-10', quantidade: '2' }, { id: '2', professor_id: 'p1', estudante_id: 's1', mes: '2026-09', quantidade: '1' }],
  };
  const sheets = {
    ensureSheetWithHeaders: async () => {},
    getRows: async (sheet) => structuredClone(banco[sheet]),
    updateRow: async (sheet, row, values) => {
      if (sheet === 'tutorias_mensais' && falharContagem) { falharContagem = false; throw new Error('Falha simulada'); }
      const headers = sheet === 'fichas_tutoria' ? api.FICHAS_TUTORIA_HEADERS : tutorHeaders;
      banco[sheet][row - 2] = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
      writes++;
    },
    appendRow: async (sheet, values) => {
      const headers = sheet === 'fichas_tutoria' ? api.FICHAS_TUTORIA_HEADERS : tutorHeaders;
      banco[sheet].push(Object.fromEntries(headers.map((h, i) => [h, values[i]])));
      writes++;
    },
  };
  const api = carregarModulo('lib/fichas-tutoria.ts', {
    '@/lib/sheets': sheets, '@/lib/permissions': permissions,
    '@/lib/tutorias': { ABA_TUTORIAS_MENSAIS: 'tutorias_mensais', TUTORIAS_MENSAIS_HEADERS: tutorHeaders, quantidadeSegura: (v) => Math.min(999, Math.max(0, Math.round(Number(v)))) },
  });
  return { api, banco, writes: () => writes, falharContagem: () => { falharContagem = true; } };
}

(async () => {
  for (const perfil of ['estudante', 'gestao']) {
    const env = ambiente();
    assert.equal((await env.api.excluirFicha({ id: 'p1', perfil }, { id: '1' })).status, 403);
    assert.equal(env.writes(), 0);
  }
  for (const [id, status] of [['', 400], ['inexistente', 404], ['3', 403]]) {
    const env = ambiente();
    assert.equal((await env.api.excluirFicha(professor, { id })).status, status);
    assert.equal(env.writes(), 0);
  }
  const desvinculado = ambiente();
  desvinculado.banco.professor_estudantes[0].ativo = 'NAO';
  assert.equal((await desvinculado.api.excluirFicha(professor, { id: '1' })).status, 403);
  assert.equal(desvinculado.writes(), 0);

  const env = ambiente();
  assert.equal((await env.api.excluirFicha(professor, { id: '1' })).success, true);
  assert.equal(env.banco.fichas_tutoria.length, 4);
  assert.equal(env.banco.fichas_tutoria[0].status_confirmacao, 'excluida');
  assert.equal(env.banco.fichas_tutoria[0].relato, 'Registro de teste');
  assert.equal(env.banco.tutorias_mensais[0].quantidade, '1');
  assert.equal(env.banco.tutorias_mensais[1].quantidade, '1');
  for (const user of [professor, { id: 's1', perfil: 'estudante' }, { id: 'g1', perfil: 'gestao' }]) {
    assert.equal((await env.api.listarFichas(user)).fichas.some(f => f.id === '1'), false);
  }
  assert.equal((await env.api.editarFicha(professor, { id: '1', data: '2026-10-12', relato: 'Editar excluída' })).success, false);
  assert.equal((await env.api.excluirFicha(professor, { id: '1' })).success, true);
  assert.equal(env.banco.tutorias_mensais[0].quantidade, '1');
  assert.equal((await env.api.excluirFicha(professor, { id: '2' })).success, true);
  assert.equal(env.banco.tutorias_mensais[0].quantidade, '0');
  assert.equal(env.banco.fichas_tutoria[2].status_confirmacao, 'registrada');
  assert.equal((await env.api.criarFicha(professor, { estudante_id: 's1', data: '2026-10-12', relato: 'Nova' })).ficha.id, '5');
  assert.equal(env.banco.tutorias_mensais[0].quantidade, '1');

  const retry = ambiente();
  retry.falharContagem();
  await assert.rejects(retry.api.excluirFicha(professor, { id: '1' }), /Falha simulada/);
  assert.equal((await retry.api.excluirFicha(professor, { id: '1' })).success, true);
  assert.equal(retry.banco.tutorias_mensais[0].quantidade, '1');

  let routeUser = null;
  let chamadasExclusao = 0;
  const route = carregarModulo('app/api/fichas-tutoria/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/auth': { getUserFromCookie: async () => routeUser },
    '@/lib/permissions': permissions,
    '@/lib/fichas-tutoria': { excluirFicha: async () => { chamadasExclusao++; return { success: true }; } },
  });
  const request = { json: async () => ({ id: '1' }) };
  assert.equal((await route.DELETE(request)).status, 401);
  routeUser = { id: 's1', perfil: 'estudante' };
  assert.equal((await route.DELETE(request)).status, 403);
  assert.equal(chamadasExclusao, 0);
  routeUser = professor;
  assert.equal((await route.DELETE({ json: async () => { throw new Error('JSON inválido'); } })).status, 400);
  assert.equal((await route.DELETE(request)).status, 200);
  assert.equal(chamadasExclusao, 1);
  console.log('Exclusão: permissões, listagens, contagem, repetição, recuperação de falha e autenticação passaram.');
})().catch(error => { console.error(error); process.exitCode = 1; });
