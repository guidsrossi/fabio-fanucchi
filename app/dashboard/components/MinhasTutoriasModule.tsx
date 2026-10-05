'use client';

import { useCallback, useEffect, useState } from 'react';

type FichaTutoria = {
  id: string;
  data: string;
  professor_nome: string;
  relato: string;
};

function mesAtual() {
  const data = new Date();
  const deslocamento = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - deslocamento).toISOString().slice(0, 7);
}

function formatarData(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function MinhasTutoriasModule() {
  const [mes, setMes] = useState('');
  const [fichas, setFichas] = useState<FichaTutoria[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async (mesReferencia: string) => {
    setCarregando(true);
    setErro('');
    try {
      const response = await fetch(`/api/fichas-tutoria?mes=${encodeURIComponent(mesReferencia)}`);
      const resultado = await response.json();
      if (!response.ok || !resultado.success) throw new Error(resultado.error || 'Não foi possível carregar suas tutorias');
      setFichas(resultado.fichas || []);
    } catch (error) {
      setFichas([]);
      setErro(error instanceof Error ? error.message : 'Erro ao carregar suas tutorias');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(mes); }, [carregar, mes]);

  return (
    <section className="rounded-[1.5rem] border border-white/70 bg-white/90 p-4 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">Perfil do estudante</p>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Minhas tutorias</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Consulte as tutorias registradas pelo professor.</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Filtrar por mês
            <input type="month" value={mes} onChange={(event) => setMes(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMes('')} className="text-xs font-semibold text-blue-700 dark:text-blue-300">Ver todas</button>
            <button type="button" onClick={() => setMes(mesAtual())} className="text-xs font-semibold text-blue-700 dark:text-blue-300">Mês atual</button>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-sm text-slate-500 dark:text-slate-400">Tutorias registradas</p><strong className="mt-1 block text-2xl">{fichas.length}</strong></div>
      </div>

      {erro ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{erro}</div> : null}

      <div className="grid gap-3">
        {fichas.map((ficha) => (
            <article key={ficha.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div><p className="font-bold text-slate-950 dark:text-white">Tutoria de {formatarData(ficha.data)}</p><p className="text-sm text-slate-500 dark:text-slate-400">Professor(a): {ficha.professor_nome}</p></div>
                <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">Registrada</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-200">{ficha.relato}</p>
            </article>
        ))}
        {carregando ? <p className="text-slate-500">Carregando tutorias...</p> : null}
        {!carregando && fichas.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-slate-500 dark:bg-white/[0.03]">Nenhuma tutoria registrada no período selecionado.</p> : null}
      </div>
    </section>
  );
}
