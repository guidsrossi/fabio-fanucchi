'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type LinhaTutoria = {
  id: string;
  nome: string;
  turma: string;
  registro_id?: string;
  quantidade: number | '';
  observacao?: string;
};

function mesAtualInput() {
  return new Date().toISOString().slice(0, 7);
}

export default function TutoriasMensaisModule() {
  const [mes, setMes] = useState(mesAtualInput());
  const [linhas, setLinhas] = useState<LinhaTutoria[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const totalTutorias = useMemo(
    () => linhas.reduce((total, linha) => total + Number(linha.quantidade || 0), 0),
    [linhas]
  );
  const estudantesComRegistro = useMemo(
    () => linhas.filter((linha) => Number(linha.quantidade || 0) > 0).length,
    [linhas]
  );

  async function carregarTutorias(mesReferencia = mes) {
    setCarregando(true);
    setErro('');
    setMensagem('');

    const response = await fetch(`/api/tutorias-mensais?mes=${encodeURIComponent(mesReferencia)}`);
    const data = await response.json();

    if (data.success) {
      setLinhas(data.estudantes || []);
    } else {
      setErro(data.error || 'Erro ao carregar tutorias mensais');
      setLinhas([]);
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarTutorias(mes);
  }, [mes]);

  function atualizarLinha(estudanteId: string, dados: Partial<LinhaTutoria>) {
    setLinhas((atuais) =>
      atuais.map((linha) =>
        linha.id === estudanteId
          ? {
              ...linha,
              ...dados,
            }
          : linha
      )
    );
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    setMensagem('');

    const response = await fetch('/api/tutorias-mensais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mes,
        registros: linhas.map((linha) => ({
          estudante_id: linha.id,
          quantidade: Number(linha.quantidade || 0),
          observacao: linha.observacao || '',
        })),
      }),
    });

    const data = await response.json();

    if (data.success) {
      setMensagem('Tutorias mensais salvas com sucesso.');
      await carregarTutorias(mes);
    } else {
      setErro(data.error || 'Erro ao salvar tutorias mensais');
    }

    setSalvando(false);
  }

  return (
    <section className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
            Registro mensal
          </p>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">
            Registro de tutorias mensais
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Informe a quantidade de tutorias realizadas com cada estudante no mes selecionado.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Mes de referencia
          <input
            type="month"
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total no mes</p>
          <strong className="mt-1 block text-2xl text-slate-950 dark:text-white">{totalTutorias}</strong>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm text-slate-500 dark:text-slate-400">Estudantes atendidos</p>
          <strong className="mt-1 block text-2xl text-slate-950 dark:text-white">
            {estudantesComRegistro}
          </strong>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm text-slate-500 dark:text-slate-400">Estudantes vinculados</p>
          <strong className="mt-1 block text-2xl text-slate-950 dark:text-white">{linhas.length}</strong>
        </div>
      </div>

      {mensagem && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
          {mensagem}
        </div>
      )}

      {erro && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {erro}
        </div>
      )}

      <form onSubmit={salvar} className="grid gap-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="hidden grid-cols-[1fr_120px_1fr] gap-3 bg-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500 dark:bg-white/10 dark:text-slate-300 md:grid">
            <span>Estudante</span>
            <span>Quantidade</span>
            <span>Observacao</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {linhas.map((linha) => (
              <div
                key={linha.id}
                className="grid gap-3 bg-white p-4 dark:bg-slate-900/70 md:grid-cols-[1fr_120px_1fr] md:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">{linha.nome}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{linha.turma}</p>
                </div>

                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200 md:block">
                  <span className="md:hidden">Quantidade</span>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    value={linha.quantidade}
                    onFocus={() => {
                      if (linha.quantidade === 0) {
                        atualizarLinha(linha.id, { quantidade: '' });
                      }
                    }}
                    onBlur={() => {
                      if (linha.quantidade === '') {
                        atualizarLinha(linha.id, { quantidade: 0 });
                      }
                    }}
                    onChange={(e) => {
                      const quantidade = e.target.value;

                      atualizarLinha(linha.id, {
                        quantidade: quantidade === '' ? '' : Math.max(0, Number(quantidade)),
                      });
                    }}
                  />
                </label>

                <input
                  className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  placeholder="Observacao opcional"
                  value={linha.observacao || ''}
                  onChange={(e) => atualizarLinha(linha.id, { observacao: e.target.value })}
                />
              </div>
            ))}

            {carregando && (
              <p className="bg-white p-4 text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                Carregando estudantes...
              </p>
            )}

            {!carregando && linhas.length === 0 && (
              <p className="bg-white p-4 text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                Nenhum estudante vinculado ao professor.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={salvando || carregando || linhas.length === 0}
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-white/10"
          >
            {salvando ? 'Salvando...' : 'Salvar registros'}
          </button>

          <button
            type="button"
            onClick={() => carregarTutorias(mes)}
            className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:text-slate-200 dark:hover:border-blue-400"
          >
            Recarregar
          </button>
        </div>
      </form>
    </section>
  );
}
