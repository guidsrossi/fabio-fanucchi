// Executa somente em memória; não acessa nem altera dados reais da escola.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function carregar(arquivo, imports, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, process: { env: {} }, ...globals,
    require: (name) => {
      if (!(name in imports)) throw new Error(`Import inesperado: ${name}`);
      return imports[name];
    },
  }, { filename: arquivo });
  return module.exports;
}

const permissions = carregar('lib/permissions.ts', {});
const gestor = { id: '1', perfil: 'gestor' };
const headers = {
  usuarios: ['id', 'nome', 'login', 'senha', 'perfil', 'turma', 'precisa_trocar_senha', 'ra', 'data_nascimento'],
  professor_estudantes: ['id', 'professor_id', 'estudante_id', 'ativo'],
};

function ambiente() {
  const banco = {
    usuarios: [gestor, { id: '2', perfil: 'professor' },
      { id: '3', nome: 'Estudante teste', login: '12345678', senha: 'segredo', perfil: 'estudante', turma: '1A', ra: '12345678' },
      { id: '4', nome: 'Sem professor', perfil: 'estudante', turma: '1B', ra: '87654321' }],
    professor_estudantes: [
      { id: '1', professor_id: '2', estudante_id: '3', ativo: 'sim' },
      { id: '2', professor_id: '5', estudante_id: '3', ativo: 'sim' },
      { id: '3', professor_id: '2', estudante_id: '4', ativo: 'nao' },
    ],
  };
  let batches = 0;
  let falharLeitura = false;
  let falharGravacao = false;
  const sheets = {
    getRows: async (sheet) => {
      if (falharLeitura && sheet === 'professor_estudantes') throw new Error('Falha de leitura');
      return structuredClone(banco[sheet]);
    },
    batchUpdateCells: async (cells) => {
      if (falharGravacao) throw new Error('Falha de gravação');
      batches++;
      for (const cell of cells) {
        banco[cell.sheetName][cell.rowNumber - 2][headers[cell.sheetName][cell.columnNumber - 1]] = cell.value;
      }
    },
  };
  const api = carregar('lib/excluir-estudante.ts', { '@/lib/sheets': sheets, '@/lib/permissions': permissions });
  return { banco, sheets, api, batches: () => batches, falharLeitura: () => { falharLeitura = true; }, falharGravacao: () => { falharGravacao = true; } };
}

(async () => {
  for (const user of [null, { perfil: 'estudante' }, { perfil: 'professor' }, { perfil: 'coordenador' }]) {
    const env = ambiente();
    assert.equal((await env.api.excluirEstudante(user, '3')).status, 403);
    assert.equal(env.batches(), 0);
  }
  for (const [id, status] of [['', 400], [null, 400], [{}, 400], ['999', 404], ['2', 404], ['1', 404]]) {
    const env = ambiente();
    assert.equal((await env.api.excluirEstudante(gestor, id)).status, status);
    assert.equal(env.batches(), 0);
  }
  for (const perfil of ['gestor', 'gestao']) {
    const env = ambiente();
    const outroUsuario = structuredClone(env.banco.usuarios[3]);
    assert.equal((await env.api.excluirEstudante({ ...gestor, perfil }, '3')).success, true);
    assert.equal(env.batches(), 1);
    assert.equal(env.banco.usuarios[2].perfil, 'estudante_excluido');
    assert.equal(env.banco.usuarios[2].login, '');
    assert.equal(env.banco.usuarios[2].senha, '');
    assert.equal(env.banco.usuarios[2].id, '3');
    assert.equal(env.banco.usuarios[2].ra, '12345678');
    assert.equal(env.banco.professor_estudantes[0].ativo, 'nao');
    assert.equal(env.banco.professor_estudantes[1].ativo, 'nao');
    assert.deepEqual(env.banco.usuarios[3], outroUsuario);
    assert.equal((await env.api.excluirEstudante(gestor, '3')).success, true);
    assert.equal(env.batches(), 1);
    assert.equal((await env.api.excluirEstudante(gestor, '4')).success, true);
  }
  for (const falha of ['falharLeitura', 'falharGravacao']) {
    const env = ambiente();
    const original = structuredClone(env.banco);
    env[falha]();
    await assert.rejects(env.api.excluirEstudante(gestor, '3'), /Falha/);
    assert.deepEqual(env.banco, original);
  }

  let routeUser = null;
  const env = ambiente();
  const route = carregar('app/api/estudantes/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/auth': { getUserFromCookie: async () => routeUser },
    '@/lib/sheets': env.sheets,
    '@/lib/permissions': permissions,
    '@/lib/estudantes': {},
    '@/lib/excluir-estudante': env.api,
  });
  const req = { json: async () => ({ estudante_id: '3' }) };
  assert.equal((await route.DELETE(req)).status, 401);
  routeUser = { perfil: 'professor' };
  assert.equal((await route.DELETE(req)).status, 403);
  routeUser = gestor;
  assert.equal((await route.DELETE({ json: async () => { throw new Error(); } })).status, 400);
  assert.equal((await route.DELETE({ json: async () => null })).status, 400);
  assert.equal((await route.DELETE(req)).status, 200);

  // Listagens existentes deixam de oferecer o estudante excluído.
  const professores = carregar('app/api/professores/route.ts', {
    'next/server': { NextResponse: { json: (body) => body } },
    '@/lib/auth': { getUserFromCookie: async () => gestor },
    '@/lib/sheets': env.sheets, '@/lib/permissions': permissions,
  });
  assert.equal((await professores.GET()).estudantes.some((e) => e.id === '3'), false);

  let payload = { id: '3', perfil: 'estudante' };
  const auth = carregar('lib/auth.ts', {
    jsonwebtoken: { verify: () => payload },
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'token-teste' }) }) },
    '@/lib/sheets': env.sheets, '@/lib/permissions': permissions,
  });
  assert.equal(await auth.getUserFromCookie(), null);
  payload = { id: '4', perfil: 'estudante' };
  assert.equal((await auth.getUserFromCookie()).id, '4');
  payload = gestor;
  assert.equal((await auth.getUserFromCookie()).id, '1');

  const login = carregar('app/api/login/route.ts', {
    'next/server': { NextResponse: { json: (body) => ({ body, cookies: { set: () => {} } }) } },
    '@/lib/sheets': env.sheets, '@/lib/auth': { createToken: () => 'token-teste' },
    '@/lib/estudantes': { normalizarRa: String, obterRaDoEstudante: (u) => u.ra },
  });
  for (const dados of [{ login: '12345678', senha: 'segredo' }, { login: 'Estudante teste', senha: '' }]) {
    assert.equal((await login.POST({ json: async () => dados })).body.success, false);
  }

  // A implementação real envia conta e vínculos em um único batchUpdate.
  const calls = [];
  const realSheets = carregar('lib/sheets.ts', {
    googleapis: { google: { auth: { JWT: class {} }, sheets: () => ({ spreadsheets: {
      get: async () => ({ data: { sheets: [{ properties: { title: 'usuarios', sheetId: 0 } }, { properties: { title: 'professor_estudantes', sheetId: 7 } }] } }),
      batchUpdate: async (request) => { calls.push(request); },
    } }) } },
  });
  await realSheets.batchUpdateCells([
    { sheetName: 'usuarios', rowNumber: 4, columnNumber: 5, value: 'estudante_excluido' },
    { sheetName: 'professor_estudantes', rowNumber: 2, columnNumber: 4, value: 'nao' },
  ]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].requestBody.requests.length, 2);
  assert.equal(calls[0].requestBody.requests[0].updateCells.range.sheetId, 0);
  assert.equal(calls[0].requestBody.requests[0].updateCells.range.startRowIndex, 3);
  await assert.rejects(realSheets.batchUpdateCells([{ sheetName: 'inexistente', rowNumber: 2, columnNumber: 1, value: '' }]), /Aba não encontrada/);
  assert.equal(calls.length, 1);

  // Exercita os botões reais com dados fictícios, incluindo cancelar a confirmação.
  let confirmar = false;
  let reloads = 0;
  let stateIndex = 0;
  const fetches = [];
  const ui = carregar('app/dashboard/components/GestaoEscolarModule.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: {
      useState: (initial) => {
        const index = stateIndex++;
        return [index === 0 ? '2' : index === 2 ? '4' : initial, () => {}];
      },
      useEffect: () => {},
    },
    '../../components/LoadingOverlay': { default: () => null },
    '../../hooks/useLoadingAction': { useLoadingAction: () => ({ loading: false, runWithLoading: async (_, action) => action() }) },
  }, {
    window: { confirm: (message) => { assert.match(message, /histórico escolar será preservado/); return confirmar; } },
    fetch: async (url, options) => { fetches.push({ url, ...options }); return { ok: true, json: async () => ({ success: true }) }; },
  }).default;
  const tree = ui({
    apoios: [], perguntas: [], professores: [{ id: '2', nome: 'Professor teste' }],
    estudantes: [{ id: '3', nome: 'Vinculado', turma: '1A', professor_id: '2' }, { id: '4', nome: 'Sem professor', turma: '1B' }],
    vinculosPorProfessor: { '2': ['3'] }, onReload: async () => { reloads++; },
  });
  const elements = [];
  function visitar(node) {
    if (Array.isArray(node)) return node.forEach(visitar);
    if (!node || typeof node !== 'object') return;
    elements.push(node);
    visitar(node.props?.children);
  }
  visitar(tree);
  const excluirVinculado = elements.find((e) => e.props?.['aria-label'] === 'Excluir estudante Vinculado');
  const excluirSelecionado = elements.find((e) => e.type === 'button' && e.props.children === 'Excluir estudante' && !e.props['aria-label']);
  assert.ok(excluirVinculado);
  assert.ok(excluirSelecionado);
  assert.equal(excluirSelecionado.props.disabled, false);
  await excluirVinculado.props.onClick();
  assert.equal(fetches.length, 0);
  confirmar = true;
  await excluirVinculado.props.onClick();
  await excluirSelecionado.props.onClick();
  assert.equal(fetches.length, 2);
  assert.equal(fetches[0].method, 'DELETE');
  assert.equal(JSON.parse(fetches[0].body).estudante_id, '3');
  assert.equal(JSON.parse(fetches[1].body).estudante_id, '4');
  const desvincular = elements.find((e) => e.type === 'button' && e.props.children === 'Desvincular');
  await desvincular.props.onClick();
  assert.equal(fetches[2].url, '/api/professores');
  assert.equal(fetches[2].method, 'PUT');
  assert.equal(reloads, 3);
  console.log('Exclusão de estudante: permissões, conta, vínculos, repetição, falhas, listagens, login, sessões, lote atômico e botões da interface passaram.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
