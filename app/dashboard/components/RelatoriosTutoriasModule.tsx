'use client';

import { useEffect, useMemo, useState } from 'react';

type Relatorio = {
  mes: string;
  filtros: {
    turmas: string[];
    professores: Array<{ id: string; nome: string; login?: string }>;
    estudantes: Array<{ id: string; nome: string; turma: string }>;
    meses: string[];
  };
  indicadores: {
    totalGeral: number;
    mediaPorEstudante: number;
    estudantesNoFiltro: number;
    comPoucasTutorias: number;
    comMuitasTutorias: number;
    limiteMuitasTutorias: number;
  };
  rankingMaior: Array<ItemEstudante>;
  rankingMenor: Array<ItemEstudante>;
  destaques: {
    poucas: Array<ItemEstudante>;
    muitas: Array<ItemEstudante>;
  };
  graficos: {
    comparativoMeses: Array<{ mes: string; total: number }>;
    porTurma: Array<{ turma: string; total: number }>;
    porProfessor: Array<{ professor: string; total: number }>;
  };
};

type ItemEstudante = {
  id: string;
  nome: string;
  turma: string;
  professor_nome: string;
  quantidade: number;
};

const cores = ['#2563eb', '#16a34a', '#f59e0b', '#e11d48', '#7c3aed', '#0891b2', '#ea580c'];

function mesAtualInput() {
  return new Date().toISOString().slice(0, 7);
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(Number(valor || 0));
}

function formatarMes(mes: string) {
  if (!/^\d{4}-\d{2}$/.test(String(mes || ''))) return mes || 'Sem mes';

  const [ano, mesNumero] = mes.split('-').map(Number);

  return new Date(ano, mesNumero - 1, 1).toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit',
  });
}

function graficoPizza(items: Array<{ total: number }>) {
  const total = items.reduce((soma, item) => soma + Number(item.total || 0), 0);

  if (total <= 0) return '#e2e8f0';

  let acumulado = 0;

  return `conic-gradient(${items
    .map((item, index) => {
      const inicio = acumulado;
      acumulado += (Number(item.total || 0) / total) * 100;
      return `${cores[index % cores.length]} ${inicio}% ${acumulado}%`;
    })
    .join(', ')})`;
}

function RankingList({ title, items }: { title: string; items: ItemEstudante[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h3 className="mb-3 font-bold text-slate-950 dark:text-white">{title}</h3>

      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={`${title}-${item.id}`}
            className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 dark:bg-slate-900/70"
          >
            <div>
              <p className="font-semibold text-slate-950 dark:text-white">{item.nome}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {item.turma} | {item.professor_nome}
              </p>
            </div>
            <strong className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
              {item.quantidade}
            </strong>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400">Nenhum estudante encontrado.</p>
        )}
      </div>
    </div>
  );
}

function DestaqueCard({
  title,
  description,
  items,
  variant,
  onOpen,
}: {
  title: string;
  description: string;
  items: ItemEstudante[];
  variant: 'poucas' | 'muitas';
  onOpen: () => void;
}) {
  const preview = items.slice(0, 8);
  const classes =
    variant === 'poucas'
      ? {
          card: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
          title: 'text-amber-900 dark:text-amber-100',
          text: 'text-amber-700 dark:text-amber-200',
          row: 'text-amber-900 dark:text-amber-100',
          empty: 'text-amber-800 dark:text-amber-100',
          button: 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:bg-amber-400/20',
        }
      : {
          card: 'border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10',
          title: 'text-blue-900 dark:text-blue-100',
          text: 'text-blue-700 dark:text-blue-200',
          row: 'text-blue-900 dark:text-blue-100',
          empty: 'text-blue-800 dark:text-blue-100',
          button: 'bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-400/10 dark:text-blue-100 dark:hover:bg-blue-400/20',
        };

  return (
    <div className={`rounded-2xl border p-4 ${classes.card}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`font-bold ${classes.title}`}>{title}</h3>
          <p className={`mt-1 text-sm ${classes.text}`}>{description}</p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${classes.button}`}
        >
          Ver todos ({items.length})
        </button>
      </div>

      <div className="grid gap-2">
        {preview.map((item) => (
          <p key={`${variant}-${item.id}`} className={`text-sm ${classes.row}`}>
            {item.nome} - {item.turma} ({item.quantidade})
          </p>
        ))}
        {items.length > preview.length && (
          <p className={`text-sm font-semibold ${classes.text}`}>
            Mostrando {preview.length} de {items.length}. Clique em Ver todos para abrir a lista completa.
          </p>
        )}
        {items.length === 0 && <p className={`text-sm ${classes.empty}`}>Nenhum destaque.</p>}
      </div>
    </div>
  );
}

export default function RelatoriosTutoriasModule() {
  const [filtros, setFiltros] = useState({
    mes: '',
    turma: '',
    professor_id: '',
    estudante_id: '',
  });
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [destaqueAberto, setDestaqueAberto] = useState<'poucas' | 'muitas' | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');

    try {
      const params = new URLSearchParams();
      if (filtros.mes) params.set('mes', filtros.mes);
      if (filtros.turma) params.set('turma', filtros.turma);
      if (filtros.professor_id) params.set('professor_id', filtros.professor_id);
      if (filtros.estudante_id) params.set('estudante_id', filtros.estudante_id);

      const response = await fetch(`/api/tutorias-mensais?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRelatorio(data.relatorio);

        if (!filtros.mes && data.relatorio?.mes) {
          setFiltros((atuais) => ({ ...atuais, mes: data.relatorio.mes }));
        }
      } else {
        setErro(data.error || 'Erro ao carregar relatorio de tutorias');
        setRelatorio(null);
      }
    } catch {
      setErro('Erro ao carregar relatorio de tutorias');
      setRelatorio(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [filtros.mes, filtros.turma, filtros.professor_id, filtros.estudante_id]);

  const opcoes = relatorio?.filtros;
  const comparativo = relatorio?.graficos.comparativoMeses || [];
  const maxComparativo = useMemo(
    () => Math.max(...comparativo.map((item) => Number(item.total || 0)), 1),
    [comparativo]
  );
  const totalPorTurma = useMemo(
    () => (relatorio?.graficos.porTurma || []).reduce((total, item) => total + Number(item.total || 0), 0),
    [relatorio]
  );
  const destaqueModal =
    relatorio && destaqueAberto
      ? {
          title:
            destaqueAberto === 'poucas'
              ? 'Destaques de poucas tutorias'
              : 'Destaques de muitas tutorias',
          description:
            destaqueAberto === 'poucas'
              ? 'Todos os estudantes sem nenhuma tutoria no mes selecionado.'
              : `Todos os estudantes com ${relatorio.indicadores.limiteMuitasTutorias} ou mais tutorias no mes.`,
          items: relatorio.destaques[destaqueAberto],
          badge:
            destaqueAberto === 'poucas'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-100'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-100',
        }
      : null;

  return (
    <>
    <section className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
          Gestao
        </p>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">
          Dashboard de tutorias mensais
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Indicadores consolidados por mes, turma, professor e estudante.
        </p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Mes
          <input
            type="month"
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            value={filtros.mes || relatorio?.mes || mesAtualInput()}
            onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Turma
          <select
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            value={filtros.turma}
            onChange={(e) => setFiltros({ ...filtros, turma: e.target.value })}
          >
            <option value="">Todas</option>
            {(opcoes?.turmas || []).map((turma) => (
              <option key={turma} value={turma}>
                {turma}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Professor
          <select
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            value={filtros.professor_id}
            onChange={(e) => setFiltros({ ...filtros, professor_id: e.target.value })}
          >
            <option value="">Todos</option>
            {(opcoes?.professores || []).map((professor) => (
              <option key={professor.id} value={professor.id}>
                {professor.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
          Estudante
          <select
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            value={filtros.estudante_id}
            onChange={(e) => setFiltros({ ...filtros, estudante_id: e.target.value })}
          >
            <option value="">Todos</option>
            {(opcoes?.estudantes || []).map((estudante) => (
              <option key={estudante.id} value={estudante.id}>
                {estudante.nome} - {estudante.turma}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {erro}
        </div>
      )}

      {carregando && (
        <p className="mb-4 text-slate-500 dark:text-slate-400">Carregando indicadores...</p>
      )}

      {relatorio && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total geral</p>
              <strong className="mt-1 block text-2xl text-slate-950 dark:text-white">
                {relatorio.indicadores.totalGeral}
              </strong>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-slate-500 dark:text-slate-400">Media por estudante</p>
              <strong className="mt-1 block text-2xl text-slate-950 dark:text-white">
                {formatarNumero(relatorio.indicadores.mediaPorEstudante)}
              </strong>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-slate-500 dark:text-slate-400">Estudantes filtrados</p>
              <strong className="mt-1 block text-2xl text-slate-950 dark:text-white">
                {relatorio.indicadores.estudantesNoFiltro}
              </strong>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-sm text-amber-700 dark:text-amber-200">Poucas tutorias</p>
              <strong className="mt-1 block text-2xl text-amber-800 dark:text-amber-100">
                {relatorio.indicadores.comPoucasTutorias}
              </strong>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
              <p className="text-sm text-blue-700 dark:text-blue-200">Muitas tutorias</p>
              <strong className="mt-1 block text-2xl text-blue-800 dark:text-blue-100">
                {relatorio.indicadores.comMuitasTutorias}
              </strong>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <RankingList title="Maiores quantidades no mes" items={relatorio.rankingMaior} />
            <RankingList title="Menores quantidades no mes" items={relatorio.rankingMenor} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <h3 className="mb-4 font-bold text-slate-950 dark:text-white">
                Comparacao entre meses
              </h3>

              <div className="grid gap-3">
                {comparativo.map((item) => (
                  <div key={item.mes} className="grid gap-2 sm:grid-cols-[90px_1fr_60px] sm:items-center">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {formatarMes(item.mes)}
                    </span>
                    <div className="h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-blue-600 dark:bg-blue-400"
                        style={{ width: `${Math.max(4, (item.total / maxComparativo) * 100)}%` }}
                      />
                    </div>
                    <strong className="text-slate-950 dark:text-white">{item.total}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <h3 className="mb-4 font-bold text-slate-950 dark:text-white">
                Distribuicao por turma
              </h3>

              <div className="flex flex-col items-center gap-4">
                <div
                  className="h-40 w-40 rounded-full border border-white shadow-inner dark:border-white/10"
                  style={{ background: graficoPizza(relatorio.graficos.porTurma) }}
                />

                <div className="grid w-full gap-2">
                  {relatorio.graficos.porTurma.map((item, index) => (
                    <div key={item.turma} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: cores[index % cores.length] }}
                        />
                        {item.turma}
                      </span>
                      <strong className="text-slate-950 dark:text-white">
                        {totalPorTurma > 0
                          ? `${formatarNumero((item.total / totalPorTurma) * 100)}%`
                          : '0%'}
                      </strong>
                    </div>
                  ))}

                  {relatorio.graficos.porTurma.length === 0 && (
                    <p className="text-slate-500 dark:text-slate-400">Sem dados para exibir.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <DestaqueCard
              title="Destaques de poucas tutorias"
              description="Estudantes sem nenhuma tutoria no mes selecionado."
              items={relatorio.destaques.poucas}
              variant="poucas"
              onOpen={() => setDestaqueAberto('poucas')}
            />

            <DestaqueCard
              title="Destaques de muitas tutorias"
              description={`Estudantes com ${relatorio.indicadores.limiteMuitasTutorias} ou mais tutorias no mes.`}
              items={relatorio.destaques.muitas}
              variant="muitas"
              onOpen={() => setDestaqueAberto('muitas')}
            />
          </div>
        </div>
      )}

    </section>

      {destaqueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5 dark:border-white/10">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                  {relatorio.mes}
                </p>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">{destaqueModal.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{destaqueModal.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setDestaqueAberto(null)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {destaqueModal.items.length} estudante(s) encontrado(s)
                </p>
              </div>

              <div className="grid gap-2">
                {destaqueModal.items.map((item) => (
                  <div
                    key={`modal-${destaqueAberto}-${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">{item.nome}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {item.turma} | {item.professor_nome}
                      </p>
                    </div>
                    <strong className={`rounded-full px-3 py-1 ${destaqueModal.badge}`}>
                      {item.quantidade}
                    </strong>
                  </div>
                ))}

                {destaqueModal.items.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-4 text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                    Nenhum estudante encontrado para este destaque.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
