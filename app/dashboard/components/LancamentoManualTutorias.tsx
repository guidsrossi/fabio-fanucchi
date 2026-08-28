'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useLoadingAction } from '../../hooks/useLoadingAction';

type LinhaTutoria = {
  id: string;
  nome: string;
  turma: string;
  quantidade: number | '';
  observacao?: string;
};

export const FIM_LANCAMENTO_MANUAL = new Date('2026-09-01T00:00:00-03:00').getTime();

export function lancamentoManualDisponivel() {
  return Date.now() < FIM_LANCAMENTO_MANUAL;
}

export default function LancamentoManualTutorias() {
  const [mes, setMes] = useState('2026-08');
  const [linhas, setLinhas] = useState<LinhaTutoria[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const { loading: salvando, loadingMessage, runWithLoading } = useLoadingAction();

  const carregar = useCallback(async (mesReferencia: string) => {
    setCarregando(true);
    setErro('');
    try {
      const response = await fetch(`/api/tutorias-mensais?mes=${encodeURIComponent(mesReferencia)}`);
      const resultado = await response.json();
      if (!response.ok || !resultado.success) throw new Error(resultado.error || 'Erro ao carregar registros');
      setLinhas(resultado.estudantes || []);
    } catch (error) {
      setLinhas([]);
      setErro(error instanceof Error ? error.message : 'Erro ao carregar registros mensais');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar(mes);
  }, [carregar, mes]);

  const total = useMemo(
    () => linhas.reduce((soma, linha) => soma + Number(linha.quantidade || 0), 0),
    [linhas]
  );

  function atualizar(id: string, dados: Partial<LinhaTutoria>) {
    setLinhas((atuais) => atuais.map((linha) => (linha.id === id ? { ...linha, ...dados } : linha)));
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    await runWithLoading('Salvando quantidades...', async () => {
      setErro('');
      setMensagem('');
      try {
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
        const resultado = await response.json();
        if (!response.ok || !resultado.success) throw new Error(resultado.error || 'Erro ao salvar quantidades');
        await carregar(mes);
        setMensagem('Quantidades mensais salvas com sucesso.');
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Erro ao salvar quantidades mensais');
      }
    });
  }

  if (!lancamentoManualDisponivel()) return null;

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-400/20 dark:bg-amber-500/5 sm:p-5">
      <LoadingOverlay show={salvando} message={loadingMessage} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">Período de transição</p>
          <h3 className="font-bold text-slate-950 dark:text-white">Lançar somente a quantidade mensal</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Disponível somente até 31/08/2026. A partir de setembro, a quantidade será calculada pelas fichas.</p>
        </div>
        <label className="grid gap-1 text-sm font-semibold">Mês
          <input type="month" value={mes} max="2026-08" onChange={(event) => setMes(event.target.value)} className="rounded-xl border border-amber-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900" />
        </label>
      </div>
      <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Total informado: {total}</p>
      {mensagem ? <div className="mb-3 rounded-xl bg-green-100 p-3 text-green-700">{mensagem}</div> : null}
      {erro ? <div className="mb-3 rounded-xl bg-red-100 p-3 text-red-700">{erro}</div> : null}
      <form onSubmit={salvar} className="grid gap-3">
        <div className="max-h-[34rem] overflow-auto rounded-xl border border-amber-200 dark:border-white/10">
          {linhas.map((linha) => (
            <div key={linha.id} className="grid gap-3 border-b border-amber-100 bg-white p-3 last:border-b-0 dark:border-white/10 dark:bg-slate-900/70 md:grid-cols-[1fr_120px_1fr] md:items-center">
              <div><p className="font-semibold">{linha.nome}</p><p className="text-sm text-slate-500">{linha.turma}</p></div>
              <label className="grid gap-1 text-sm font-semibold"><span className="md:hidden">Quantidade</span><input type="number" min={0} max={999} value={linha.quantidade} onChange={(event) => atualizar(linha.id, { quantidade: event.target.value === '' ? '' : Math.max(0, Number(event.target.value)) })} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950" /></label>
              <input value={linha.observacao || ''} onChange={(event) => atualizar(linha.id, { observacao: event.target.value })} placeholder="Observação opcional" className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950" />
            </div>
          ))}
          {carregando ? <p className="bg-white p-4 text-slate-500 dark:bg-slate-900">Carregando tutorados...</p> : null}
          {!carregando && !linhas.length ? <p className="bg-white p-4 text-slate-500 dark:bg-slate-900">Nenhum tutorado vinculado.</p> : null}
        </div>
        <button disabled={salvando || carregando || !linhas.length} className="w-fit rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white disabled:opacity-50">Salvar quantidades</button>
      </form>
    </section>
  );
}
