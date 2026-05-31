'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Apoio, Estudante, Pergunta, Professor, VinculosPorProfessor } from '../types';

type Props = {
  apoios: Apoio[];
  professores: Professor[];
  estudantes: Estudante[];
  perguntas: Pergunta[];
  vinculosPorProfessor: VinculosPorProfessor;
  onReload: () => void;
};

function ordenarEstudantesPorTurmaENome(lista: Estudante[]) {
  return [...lista].sort((a, b) => {
    const turma = String(a.turma || '').localeCompare(String(b.turma || ''));

    if (turma !== 0) return turma;

    return String(a.nome || '').localeCompare(String(b.nome || ''));
  });
}

function perguntaEstaAtiva(pergunta: Pergunta) {
  return !['nao', 'false', '0'].includes(String(pergunta.ativa || '').trim().toLowerCase());
}

function gerarEmailEstudante(nome: string) {
  const partes = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) return '';

  const primeiroNome = partes[0];
  const ultimoNome = partes.length > 1 ? partes[partes.length - 1] : '';
  const usuario = [primeiroNome, ultimoNome].filter(Boolean).join('.');

  return `${usuario}@escola.com`;
}

export default function GestaoEscolarModule({
  apoios,
  professores,
  estudantes,
  perguntas,
  vinculosPorProfessor,
  onReload,
}: Props) {
  const [professorSelecionadoId, setProfessorSelecionadoId] = useState('');
  const [novoEstudanteId, setNovoEstudanteId] = useState('');
  const [professorMensagem, setProfessorMensagem] = useState('');
  const [professorErro, setProfessorErro] = useState('');
  const [estudanteMensagem, setEstudanteMensagem] = useState('');
  const [estudanteErro, setEstudanteErro] = useState('');
  const [perguntaMensagem, setPerguntaMensagem] = useState('');
  const [perguntaErro, setPerguntaErro] = useState('');
  const [perguntaEditandoId, setPerguntaEditandoId] = useState('');

  const [professorForm, setProfessorForm] = useState({
    nome: '',
    email: '',
  });
  const [estudanteForm, setEstudanteForm] = useState({
    nome: '',
    turma: '',
  });
  const [perguntaForm, setPerguntaForm] = useState({
    pergunta: '',
    tipo: 'sim_nao',
  });

  useEffect(() => {
    if (professores.length === 0) {
      setProfessorSelecionadoId('');
      return;
    }

    const professorAindaExiste = professores.some(
      (professor) => professor.id === professorSelecionadoId
    );

    if (!professorSelecionadoId || !professorAindaExiste) {
      setProfessorSelecionadoId(professores[0].id);
    }
  }, [professores, professorSelecionadoId]);

  function turmasDisponiveis() {
    return Array.from(
      new Set(estudantes.map((estudante) => String(estudante.turma || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }

  function estudantesDoProfessor(professorId: string) {
    const estudantesIds = vinculosPorProfessor[professorId] || [];

    return ordenarEstudantesPorTurmaENome(
      estudantes.filter((estudante) => estudantesIds.includes(estudante.id))
    );
  }

  function estudantesSemProfessor() {
    return ordenarEstudantesPorTurmaENome(
      estudantes.filter((estudante) => !estudante.professor_id)
    );
  }

  function contarApoiosRecebidos(estudanteId: string) {
    return apoios.filter((apoio) => String(apoio.estudante_id || '').trim() === estudanteId).length;
  }

  function professorSelecionado() {
    return professores.find((professor) => professor.id === professorSelecionadoId);
  }

  function limparFormularioPergunta() {
    setPerguntaForm({ pergunta: '', tipo: 'sim_nao' });
    setPerguntaEditandoId('');
  }

  function editarPergunta(pergunta: Pergunta) {
    setPerguntaMensagem('');
    setPerguntaErro('');
    setPerguntaEditandoId(pergunta.id);
    setPerguntaForm({
      pergunta: pergunta.pergunta || '',
      tipo: pergunta.tipo || 'sim_nao',
    });
  }

  async function cadastrarProfessor(e: FormEvent) {
    e.preventDefault();
    setProfessorMensagem('');
    setProfessorErro('');

    const response = await fetch('/api/professores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(professorForm),
    });

    const data = await response.json();

    if (data.success) {
      setProfessorMensagem(`Professor cadastrado. Senha inicial: ${data.senha_temporaria}`);
      setProfessorForm({ nome: '', email: '' });
      onReload();
      return;
    }

    setProfessorErro(data.error || 'Erro ao cadastrar professor');
  }

  async function cadastrarEstudante(e: FormEvent) {
    e.preventDefault();
    setEstudanteMensagem('');
    setEstudanteErro('');

    const response = await fetch('/api/estudantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estudanteForm),
    });

    const data = await response.json();

    if (data.success) {
      setEstudanteMensagem(`Estudante cadastrado. Senha inicial: ${data.senha_temporaria}`);
      setEstudanteForm({ nome: '', turma: '' });
      onReload();
      return;
    }

    setEstudanteErro(data.error || 'Erro ao cadastrar estudante');
  }

  async function atualizarVinculosProfessor(
    professorId: string,
    estudantesIds: string[],
    mensagemSucesso: string
  ) {
    setProfessorMensagem('');
    setProfessorErro('');

    const response = await fetch('/api/professores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professor_id: professorId,
        estudantes: estudantesIds,
      }),
    });

    const data = await response.json();

    if (data.success) {
      setProfessorMensagem(mensagemSucesso);
      setNovoEstudanteId('');
      onReload();
      return;
    }

    setProfessorErro(data.error || 'Erro ao salvar vinculos');
  }

  function adicionarEstudanteAoProfessor() {
    if (!professorSelecionadoId || !novoEstudanteId) return;

    const estudantesAtuais = vinculosPorProfessor[professorSelecionadoId] || [];
    const proximosEstudantes = Array.from(new Set([...estudantesAtuais, novoEstudanteId]));

    atualizarVinculosProfessor(
      professorSelecionadoId,
      proximosEstudantes,
      'Estudante vinculado ao professor.'
    );
  }

  function removerEstudanteDoProfessor(estudanteId: string) {
    if (!professorSelecionadoId) return;

    const estudantesAtuais = vinculosPorProfessor[professorSelecionadoId] || [];

    atualizarVinculosProfessor(
      professorSelecionadoId,
      estudantesAtuais.filter((item) => item !== estudanteId),
      'Vinculo removido do professor.'
    );
  }

  async function salvarPergunta(e: FormEvent) {
    e.preventDefault();
    setPerguntaMensagem('');
    setPerguntaErro('');

    const perguntaAtual = perguntas.find((pergunta) => pergunta.id === perguntaEditandoId);
    const response = await fetch('/api/perguntas', {
      method: perguntaEditandoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: perguntaEditandoId,
        ...perguntaForm,
        ativa: perguntaAtual ? perguntaEstaAtiva(perguntaAtual) : true,
      }),
    });

    const data = await response.json();

    if (data.success) {
      setPerguntaMensagem(perguntaEditandoId ? 'Pergunta atualizada.' : 'Pergunta cadastrada.');
      limparFormularioPergunta();
      onReload();
      return;
    }

    setPerguntaErro(data.error || 'Erro ao salvar pergunta');
  }

  async function alterarStatusPergunta(pergunta: Pergunta, ativa: boolean) {
    setPerguntaMensagem('');
    setPerguntaErro('');

    const response = await fetch('/api/perguntas', {
      method: ativa ? 'PUT' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: pergunta.id,
        pergunta: pergunta.pergunta,
        tipo: pergunta.tipo,
        ativa,
      }),
    });

    const data = await response.json();

    if (data.success) {
      setPerguntaMensagem(ativa ? 'Pergunta reativada.' : 'Pergunta desativada.');

      if (perguntaEditandoId === pergunta.id && !ativa) {
        limparFormularioPergunta();
      }

      onReload();
      return;
    }

    setPerguntaErro(data.error || 'Erro ao atualizar pergunta');
  }

  return (
    <section className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
          Gestao escolar
        </p>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">
          Administracao da plataforma
        </h2>
      </div>

      {professorMensagem && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
          {professorMensagem}
        </div>
      )}

      {professorErro && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {professorErro}
        </div>
      )}

      <form onSubmit={cadastrarProfessor} className="grid gap-4 md:grid-cols-3">
        <input
          className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
          placeholder="Nome do professor"
          value={professorForm.nome}
          onChange={(e) => setProfessorForm({ ...professorForm, nome: e.target.value })}
          required
        />

        <input
          className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
          type="email"
          placeholder="E-mail"
          value={professorForm.email}
          onChange={(e) => setProfessorForm({ ...professorForm, email: e.target.value })}
          required
        />

        <button className="rounded-xl bg-blue-700 p-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400">
          Cadastrar professor
        </button>
      </form>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        O professor entra com a senha 123456 e troca a senha no primeiro acesso.
      </p>

      <div className="mt-8 border-t border-slate-200 pt-8 dark:border-white/10">
        <h3 className="mb-3 text-lg font-bold text-slate-950 dark:text-white">
          Cadastrar estudante
        </h3>

        {estudanteMensagem && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
            {estudanteMensagem}
          </div>
        )}

        {estudanteErro && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {estudanteErro}
          </div>
        )}

        <form onSubmit={cadastrarEstudante} className="grid gap-4 md:grid-cols-4">
          <input
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            placeholder="Nome do estudante"
            value={estudanteForm.nome}
            onChange={(e) => setEstudanteForm({ ...estudanteForm, nome: e.target.value })}
            required
          />

          <input
            className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            value={gerarEmailEstudante(estudanteForm.nome)}
            placeholder="E-mail automatico"
            readOnly
          />

          <select
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            value={estudanteForm.turma}
            onChange={(e) => setEstudanteForm({ ...estudanteForm, turma: e.target.value })}
            disabled={turmasDisponiveis().length === 0}
            required
          >
            <option value="">
              {turmasDisponiveis().length === 0 ? 'Nenhuma turma cadastrada' : 'Selecione a turma'}
            </option>
            {turmasDisponiveis().map((turma) => (
              <option key={turma} value={turma}>
                {turma}
              </option>
            ))}
          </select>

          <button
            className="rounded-xl bg-blue-700 p-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-white/10"
            disabled={turmasDisponiveis().length === 0}
          >
            Cadastrar estudante
          </button>
        </form>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          O estudante entra com a senha 123456 e troca a senha no primeiro acesso.
        </p>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-8 dark:border-white/10">
        <h3 className="mb-3 text-lg font-bold text-slate-950 dark:text-white">
          Vincular professor com estudantes
        </h3>

        {professores.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400">Nenhum professor cadastrado.</p>
        )}

        {professores.length > 0 && estudantes.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400">
            Cadastre estudantes para liberar as opcoes de vinculo.
          </p>
        )}

        {professores.length > 0 && (
          <div className="grid gap-4">
            <select
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              value={professorSelecionadoId}
              onChange={(e) => {
                setProfessorSelecionadoId(e.target.value);
                setNovoEstudanteId('');
              }}
            >
              {professores.map((professor) => (
                <option key={professor.id} value={professor.id}>
                  {professor.nome} - {professor.email}
                </option>
              ))}
            </select>

            {professorSelecionado() && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex flex-col gap-1">
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {professorSelecionado()?.nome}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {professorSelecionado()?.email}
                  </p>
                </div>

                <div className="mb-5">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Estudantes associados
                  </p>

                  <div className="grid gap-2">
                    {estudantesDoProfessor(professorSelecionadoId).map((estudante) => (
                      <div
                        key={`${professorSelecionadoId}-${estudante.id}`}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-950 dark:text-white">
                            {estudante.nome}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {estudante.turma} | {contarApoiosRecebidos(estudante.id)} apoio(s) recebido(s)
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removerEstudanteDoProfessor(estudante.id)}
                          className="w-fit rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10"
                        >
                          Remover
                        </button>
                      </div>
                    ))}

                    {estudantesDoProfessor(professorSelecionadoId).length === 0 && (
                      <p className="text-slate-500 dark:text-slate-400">
                        Este professor ainda nao tem estudantes associados.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <select
                    className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    value={novoEstudanteId}
                    onChange={(e) => setNovoEstudanteId(e.target.value)}
                    disabled={estudantesSemProfessor().length === 0}
                  >
                    <option value="">
                      {estudantesSemProfessor().length === 0
                        ? 'Nenhum estudante sem professor'
                        : 'Selecione um estudante sem professor'}
                    </option>
                    {estudantesSemProfessor().map((estudante) => (
                      <option key={estudante.id} value={estudante.id}>
                        {estudante.nome} - {estudante.turma}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={adicionarEstudanteAoProfessor}
                    disabled={!novoEstudanteId}
                    className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-white/10"
                  >
                    Adicionar estudante
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-8 dark:border-white/10">
        <h3 className="mb-3 text-lg font-bold text-slate-950 dark:text-white">
          Gerenciar perguntas pre-definidas
        </h3>

        {perguntaMensagem && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
            {perguntaMensagem}
          </div>
        )}

        {perguntaErro && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {perguntaErro}
          </div>
        )}

        <form onSubmit={salvarPergunta} className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
          <input
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            placeholder="Texto da pergunta"
            value={perguntaForm.pergunta}
            onChange={(e) => setPerguntaForm({ ...perguntaForm, pergunta: e.target.value })}
            required
          />

          <select
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            value={perguntaForm.tipo}
            onChange={(e) => setPerguntaForm({ ...perguntaForm, tipo: e.target.value })}
          >
            <option value="sim_nao">Sim/Nao</option>
            <option value="texto">Texto</option>
          </select>

          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400">
              {perguntaEditandoId ? 'Salvar pergunta' : 'Adicionar pergunta'}
            </button>

            {perguntaEditandoId && (
              <button
                type="button"
                onClick={limparFormularioPergunta}
                className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:text-slate-200 dark:hover:border-blue-400"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="mt-5 grid gap-3">
          {perguntas.map((pergunta) => (
            <div
              key={pergunta.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950 dark:text-white">{pergunta.pergunta}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      perguntaEstaAtiva(pergunta)
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-200'
                        : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                    }`}
                  >
                    {perguntaEstaAtiva(pergunta) ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Tipo: {pergunta.tipo === 'sim_nao' ? 'Sim/Nao' : 'Texto'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => editarPergunta(pergunta)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:text-slate-200 dark:hover:border-blue-400"
                >
                  Editar
                </button>

                {perguntaEstaAtiva(pergunta) ? (
                  <button
                    type="button"
                    onClick={() => alterarStatusPergunta(pergunta, false)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10"
                  >
                    Desativar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => alterarStatusPergunta(pergunta, true)}
                    className="rounded-xl border border-green-200 px-3 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50 dark:border-green-500/30 dark:text-green-200 dark:hover:bg-green-500/10"
                  >
                    Reativar
                  </button>
                )}
              </div>
            </div>
          ))}

          {perguntas.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400">Nenhuma pergunta cadastrada.</p>
          )}
        </div>
      </div>
    </section>
  );
}
