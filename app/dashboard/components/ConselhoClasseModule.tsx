'use client';

import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { useEffect, useMemo, useState } from 'react';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useLoadingAction } from '../../hooks/useLoadingAction';
import {
  calcularSituacaoPorMarcacoes,
  type SituacaoConselho as Situacao,
} from '@/lib/conselho-regras';

type Categoria = '' | 'A' | 'E' | 'D' | 'T';

type Componente = { codigo: string; nome: string };
type EstudanteConselho = {
  id: string;
  nome: string;
  turma: string;
  marcacoes: Record<string, Categoria>;
  situacao: Situacao;
  frequencia: string;
  observacao: string;
  atualizado_em?: string;
};

type EstatisticaBimestre = {
  bimestre: number;
  totalEstudantes: number;
  totalMarcacoes: number;
  frequenciaMedia: number | null;
  situacoes: Record<Situacao, number>;
};

const CATEGORIAS: Categoria[] = ['', 'A', 'E', 'D', 'T'];
const LEGENDA_CATEGORIAS: Record<Exclude<Categoria, ''>, string> = {
  A: 'Assiduidade',
  E: 'Engajamento',
  D: 'Dificuldade',
  T: 'Todos',
};

const CLASSES_SITUACAO: Record<Situacao, string> = {
  sem_classificacao: 'bg-white dark:bg-slate-950',
  azul: 'bg-cyan-100/90 dark:bg-cyan-950/45',
  rosa: 'bg-pink-100/90 dark:bg-pink-950/45',
  verde: 'bg-emerald-100/90 dark:bg-emerald-950/45',
};

const ROTULOS_SITUACAO: Record<Situacao, string> = {
  sem_classificacao: '-',
  azul: 'Azul',
  rosa: 'Rosa',
  verde: 'Verde',
};

function corPdf(situacao: Situacao): [number, number, number] {
  if (situacao === 'azul') return [165, 243, 252];
  if (situacao === 'rosa') return [252, 207, 232];
  if (situacao === 'verde') return [187, 247, 208];
  return [255, 255, 255];
}

function situacaoDaLinha(estudante: EstudanteConselho): Situacao {
  const situacaoCalculada = calcularSituacaoPorMarcacoes(estudante.marcacoes);

  return situacaoCalculada === 'sem_classificacao'
    ? estudante.situacao
    : situacaoCalculada;
}

function lerFrequencia(valor: string) {
  const numero = Number(String(valor || '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(numero) && numero >= 0 && numero <= 100 ? numero : null;
}

function resumirBimestre(bimestre: number, estudantes: EstudanteConselho[]): EstatisticaBimestre {
  const frequencias = estudantes
    .map((estudante) => lerFrequencia(estudante.frequencia))
    .filter((valor): valor is number => valor !== null);

  return {
    bimestre,
    totalEstudantes: estudantes.length,
    totalMarcacoes: estudantes.reduce(
      (total, estudante) => total + Object.keys(estudante.marcacoes || {}).length,
      0
    ),
    frequenciaMedia: frequencias.length
      ? frequencias.reduce((total, valor) => total + valor, 0) / frequencias.length
      : null,
    situacoes: estudantes.reduce<Record<Situacao, number>>(
      (totais, estudante) => {
        totais[situacaoDaLinha(estudante)] += 1;
        return totais;
      },
      { sem_classificacao: 0, azul: 0, rosa: 0, verde: 0 }
    ),
  };
}

function GraficoBarras({
  estatisticas,
  obterValor,
  formatarValor,
  cor = 'bg-blue-600 dark:bg-blue-400',
}: {
  estatisticas: EstatisticaBimestre[];
  obterValor: (estatistica: EstatisticaBimestre) => number | null;
  formatarValor: (valor: number | null) => string;
  cor?: string;
}) {
  const valores = estatisticas.map(obterValor);
  const maximo = Math.max(1, ...valores.map((valor) => valor || 0));

  return (
    <div className="grid h-52 grid-cols-4 gap-3" role="img" aria-label="Gráfico comparativo por bimestre">
      {estatisticas.map((estatistica, indice) => {
        const valor = valores[indice];
        const altura = valor === null ? 0 : Math.max(4, (valor / maximo) * 100);

        return (
          <div key={estatistica.bimestre} className="flex min-w-0 flex-col items-center justify-end">
            <span className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {formatarValor(valor)}
            </span>
            <div className="flex h-36 w-full max-w-16 items-end rounded-t-xl bg-slate-100 dark:bg-white/5">
              <div
                className={`w-full rounded-t-xl transition-[height] duration-500 ${cor}`}
                style={{ height: `${altura}%` }}
                title={`${estatistica.bimestre}º bimestre: ${formatarValor(valor)}`}
              />
            </div>
            <span className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {estatistica.bimestre}º bim.
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ConselhoClasseModule() {
  const [ano, setAno] = useState(2026);
  const [bimestre, setBimestre] = useState(1);
  const [turma, setTurma] = useState('1A');
  const [turmas, setTurmas] = useState<string[]>([]);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [estudantes, setEstudantes] = useState<EstudanteConselho[]>([]);
  const [fonteDigitalizada, setFonteDigitalizada] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [alterado, setAlterado] = useState(false);
  const [estatisticas, setEstatisticas] = useState<EstatisticaBimestre[]>([]);
  const [carregandoEstatisticas, setCarregandoEstatisticas] = useState(false);
  const [erroEstatisticas, setErroEstatisticas] = useState('');
  const { loading, loadingMessage, runWithLoading } = useLoadingAction();

  async function carregarEstatisticas() {
    setCarregandoEstatisticas(true);
    setErroEstatisticas('');

    try {
      const resultados = await Promise.all(
        [1, 2, 3, 4].map(async (item) => {
          const params = new URLSearchParams({
            ano: String(ano),
            bimestre: String(item),
            turma,
          });
          const response = await fetch(`/api/conselho?${params}`);
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.error);
          return resumirBimestre(item, data.estudantes || []);
        })
      );
      setEstatisticas(resultados);
    } catch {
      setErroEstatisticas('Não foi possível carregar a comparação dos bimestres.');
    } finally {
      setCarregandoEstatisticas(false);
    }
  }

  async function carregar() {
    await runWithLoading('Carregando conselho de classe...', async () => {
      setErro('');
      setMensagem('');

      try {
        const params = new URLSearchParams({
          ano: String(ano),
          bimestre: String(bimestre),
          turma,
        });
        const response = await fetch(`/api/conselho?${params}`);
        const data = await response.json();

        if (!data.success) {
          setErro(data.error || 'Não foi possível carregar o conselho');
          return;
        }

        setTurmas(data.turmas || []);
        setComponentes(data.componentes || []);
        setEstudantes(
          (data.estudantes || []).map((estudante: EstudanteConselho) => {
            const situacaoCalculada = calcularSituacaoPorMarcacoes(estudante.marcacoes || {});

            return {
              ...estudante,
              situacao:
                situacaoCalculada === 'sem_classificacao'
                  ? estudante.situacao
                  : situacaoCalculada,
            };
          })
        );
        setFonteDigitalizada(data.fonte_digitalizada || '');
        setAlterado(Boolean(data.preenchimento_inicial));
        if (data.preenchimento_inicial) {
          setMensagem('Pré-carga do 1º bimestre de 2026 pronta para revisão e salvamento.');
        }
      } catch {
        setErro('Não foi possível carregar o conselho');
      }
    });
  }

  useEffect(() => {
    carregar();
    // A consulta deve acompanhar apenas os filtros selecionados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, bimestre, turma]);

  useEffect(() => {
    carregarEstatisticas();
    // A comparação muda apenas com o ano ou a turma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, turma]);

  function atualizarEstudante(
    estudanteId: string,
    atualizacao: Partial<Pick<EstudanteConselho, 'situacao' | 'frequencia' | 'observacao' | 'marcacoes'>>
  ) {
    setEstudantes((atuais) =>
      atuais.map((estudante) =>
        estudante.id === estudanteId ? { ...estudante, ...atualizacao } : estudante
      )
    );
    setAlterado(true);
    setMensagem('');
  }

  function alternarCategoria(estudante: EstudanteConselho, codigo: string) {
    const atual = estudante.marcacoes[codigo] || '';
    const proxima = CATEGORIAS[(CATEGORIAS.indexOf(atual) + 1) % CATEGORIAS.length];
    const marcacoes = { ...estudante.marcacoes };

    if (proxima) marcacoes[codigo] = proxima;
    else delete marcacoes[codigo];

    atualizarEstudante(estudante.id, {
      marcacoes,
      situacao: calcularSituacaoPorMarcacoes(marcacoes),
    });
  }

  async function salvar() {
    await runWithLoading('Salvando conselho de classe...', async () => {
      setErro('');
      setMensagem('');

      try {
        const response = await fetch('/api/conselho', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ano,
            bimestre,
            turma,
            registros: estudantes.map((estudante) => ({
              estudante_id: estudante.id,
              marcacoes: estudante.marcacoes,
              situacao: situacaoDaLinha(estudante),
              frequencia: estudante.frequencia,
              observacao: estudante.observacao,
            })),
          }),
        });
        const data = await response.json();

        if (!data.success) {
          setErro(data.error || 'Não foi possível salvar o conselho');
          return;
        }

        setMensagem('Conselho salvo com sucesso.');
        setAlterado(false);
        await carregarEstatisticas();
      } catch {
        setErro('Não foi possível salvar o conselho');
      }
    });
  }

  const totalMarcacoes = useMemo(
    () => estudantes.reduce((total, estudante) => total + Object.keys(estudante.marcacoes).length, 0),
    [estudantes]
  );

  async function gerarPdf() {
    await runWithLoading('Gerando PDF de todas as turmas...', async () => {
      setErro('');

      try {
        const turmasParaExportar = turmas.length ? turmas : [turma];
        const dadosDasTurmas = await Promise.all(
          turmasParaExportar.map(async (turmaPdf) => {
            // Mantém no PDF as alterações ainda não salvas da turma aberta.
            if (turmaPdf === turma) {
              return { turma: turmaPdf, componentes, estudantes };
            }

            const params = new URLSearchParams({
              ano: String(ano),
              bimestre: String(bimestre),
              turma: turmaPdf,
            });
            const response = await fetch(`/api/conselho?${params}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
              throw new Error(data.error || `Não foi possível carregar a turma ${turmaPdf}`);
            }

            return {
              turma: turmaPdf,
              componentes: (data.componentes || []) as Componente[],
              estudantes: (data.estudantes || []) as EstudanteConselho[],
            };
          })
        );

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
        const geradoEm = new Date().toLocaleString('pt-BR');

        dadosDasTurmas.forEach((dados, indiceTurma) => {
          if (indiceTurma > 0) doc.addPage('a3', 'landscape');

          const cabecalho = [
            'NOME DO ALUNO',
            ...dados.componentes.map((componente) => componente.codigo),
            'FREQ.',
          ];
          const linhas = dados.estudantes.map((estudante) => [
            estudante.nome,
            ...dados.componentes.map(
              (componente) => estudante.marcacoes?.[componente.codigo] || ''
            ),
            estudante.frequencia,
          ]);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(17);
          doc.text('ESCOLA ESTADUAL PROF. FABIO FANUCCHI', 14, 13);
          doc.setFontSize(14);
          doc.text(
            `CONSELHO DE CLASSE — ${dados.turma} — ${bimestre}º BIMESTRE DE ${ano}`,
            14,
            21
          );
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text('A = Assiduidade   E = Engajamento   D = Dificuldade   T = Todos', 14, 28);
          doc.text(
            'Azul = dificuldade   Rosa = dificuldade + assiduidade   Verde = outras marcações',
            205,
            28
          );

          autoTable(doc, {
            startY: 33,
            head: [cabecalho],
            body: linhas,
            theme: 'grid',
            margin: { top: 12, left: 10, right: 10, bottom: 14 },
            styles: {
              font: 'helvetica',
              fontSize: 9,
              cellPadding: 1.5,
              halign: 'center',
              valign: 'middle',
              lineColor: [30, 41, 59],
              lineWidth: 0.15,
              overflow: 'linebreak',
            },
            headStyles: {
              fillColor: [250, 204, 21],
              textColor: [15, 23, 42],
              fontSize: 9.5,
              fontStyle: 'bold',
            },
            columnStyles: {
              0: { cellWidth: 72, halign: 'left', fontStyle: 'bold' },
              [cabecalho.length - 1]: { cellWidth: 17 },
            },
            didParseCell: (data) => {
              if (data.section !== 'body') return;
              const estudante = dados.estudantes[data.row.index];
              data.cell.styles.fillColor = corPdf(
                estudante ? situacaoDaLinha(estudante) : 'sem_classificacao'
              );
            },
            didDrawPage: () => {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.text(
                `Turma ${dados.turma} · Gerado em ${geradoEm}`,
                10,
                doc.internal.pageSize.getHeight() - 6
              );
            },
          });
        });

        doc.save(`conselho-${ano}-${bimestre}b-todas-as-turmas.pdf`);
        setMensagem(`PDF gerado com ${dadosDasTurmas.length} turmas.`);
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Não foi possível gerar o PDF');
      }
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
      <LoadingOverlay show={loading} message={loadingMessage} />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
            Coordenação pedagógica
          </p>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Conselho de classe</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Clique nas células para alternar entre A, E, D, T e vazio.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Ano
            <input
              type="number"
              min={2020}
              max={2100}
              value={ano}
              onChange={(event) => setAno(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Bimestre
            <select
              value={bimestre}
              onChange={(event) => setBimestre(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"
            >
              {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º bimestre</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Turma
            <select
              value={turma}
              onChange={(event) => setTurma(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"
            >
              {(turmas.length ? turmas : [turma]).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold">
        {Object.entries(LEGENDA_CATEGORIAS).map(([sigla, descricao]) => (
          <span key={sigla} className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 dark:bg-white/10 dark:text-slate-200">
            {sigla} — {descricao}
          </span>
        ))}
        <span className="rounded-full bg-cyan-100 px-3 py-1.5 text-cyan-900">Azul — dificuldade</span>
        <span className="rounded-full bg-pink-100 px-3 py-1.5 text-pink-900">Rosa — dificuldade + assiduidade</span>
        <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-900">Verde — outras marcações</span>
      </div>

      {fonteDigitalizada && (
        <details className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-400/20 dark:bg-blue-500/5">
          <summary className="cursor-pointer font-semibold text-blue-800 dark:text-blue-200">
            Conferir ficha original digitalizada de {turma}
          </summary>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            A classificação por cor foi pré-carregada desta ficha. Use a imagem para revisar as marcações manuscritas durante a digitação.
          </p>
          <a href={fonteDigitalizada} target="_blank" rel="noreferrer">
            <img
              src={fonteDigitalizada}
              alt={`Ficha original do conselho da turma ${turma}`}
              className="mt-4 max-h-[44rem] w-full rounded-xl border border-slate-200 bg-white object-contain dark:border-white/10"
            />
          </a>
        </details>
      )}

      {mensagem && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700">{mensagem}</div>}
      {erro && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{erro}</div>}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
              Estatísticas
            </p>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              Comparativo dos bimestres
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Evolução da turma {turma} em {ano}. Bimestres sem registros aparecem zerados.
            </p>
          </div>
          {carregandoEstatisticas && (
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Atualizando gráficos...
            </span>
          )}
        </div>

        {erroEstatisticas ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erroEstatisticas}
          </div>
        ) : (
          <div className={`mt-4 grid gap-4 lg:grid-cols-3 ${carregandoEstatisticas ? 'opacity-60' : ''}`}>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
              <h4 className="font-bold text-slate-900 dark:text-white">Marcações registradas</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total de células A, E, D ou T</p>
              <GraficoBarras
                estatisticas={estatisticas}
                obterValor={(item) => item.totalMarcacoes}
                formatarValor={(valor) => String(valor || 0)}
              />
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
              <h4 className="font-bold text-slate-900 dark:text-white">Frequência média</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Média dos percentuais preenchidos</p>
              <GraficoBarras
                estatisticas={estatisticas}
                obterValor={(item) => item.frequenciaMedia}
                formatarValor={(valor) => valor === null ? '—' : `${valor.toFixed(1)}%`}
                cor="bg-emerald-600 dark:bg-emerald-400"
              />
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
              <h4 className="font-bold text-slate-900 dark:text-white">Classificação dos estudantes</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição proporcional por situação</p>
              <div className="mt-5 space-y-5">
                {estatisticas.map((item) => {
                  const total = Math.max(1, item.totalEstudantes);
                  return (
                    <div key={item.bimestre}>
                      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span>{item.bimestre}º bimestre</span>
                        <span>{item.totalEstudantes} estudantes</span>
                      </div>
                      <div className="flex h-7 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                        {(['azul', 'rosa', 'verde', 'sem_classificacao'] as Situacao[]).map((situacao) => {
                          const quantidade = item.situacoes[situacao];
                          const cores: Record<Situacao, string> = {
                            azul: 'bg-cyan-400',
                            rosa: 'bg-pink-400',
                            verde: 'bg-emerald-400',
                            sem_classificacao: 'bg-slate-300 dark:bg-slate-600',
                          };
                          return quantidade ? (
                            <div
                              key={situacao}
                              className={`flex items-center justify-center text-[0.65rem] font-black text-slate-900 ${cores[situacao]}`}
                              style={{ width: `${(quantidade / total) * 100}%` }}
                              title={`${ROTULOS_SITUACAO[situacao]}: ${quantidade}`}
                            >
                              {quantidade}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[0.65rem] font-semibold">
                <span className="rounded-full bg-cyan-100 px-2 py-1 text-cyan-900">Azul</span>
                <span className="rounded-full bg-pink-100 px-2 py-1 text-pink-900">Rosa</span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-900">Verde</span>
                <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">Sem classificação</span>
              </div>
            </article>
          </div>
        )}
      </section>

      <div className="mt-5 max-h-[72vh] overflow-auto rounded-2xl border border-slate-200 dark:border-white/10">
        <table className="min-w-max border-separate border-spacing-0 text-xs">
          <thead className="bg-amber-300 text-slate-950">
            <tr>
              <th className="sticky left-0 top-0 z-40 min-w-72 border border-slate-500 bg-amber-300 p-2 text-left">Nome do aluno</th>
              <th className="sticky top-0 z-30 w-20 border border-slate-500 bg-amber-300 p-2">Cor auto</th>
              {componentes.map((componente) => (
                <th key={componente.codigo} title={componente.nome} className="sticky top-0 z-30 w-12 border border-slate-500 bg-amber-300 p-2">
                  {componente.codigo}
                </th>
              ))}
              <th className="sticky top-0 z-30 w-20 border border-slate-500 bg-amber-300 p-2">Freq.</th>
              <th className="sticky top-0 z-30 min-w-52 border border-slate-500 bg-amber-300 p-2">Observação</th>
            </tr>
          </thead>
          <tbody>
            {estudantes.map((estudante) => {
              const situacao = situacaoDaLinha(estudante);

              return (
              <tr key={estudante.id} className={CLASSES_SITUACAO[situacao]}>
                <th className={`sticky left-0 z-10 border border-slate-300 p-2 text-left font-semibold dark:border-white/10 ${CLASSES_SITUACAO[situacao]}`}>
                  {estudante.nome}
                </th>
                <td className="border border-slate-300 p-1 text-center dark:border-white/10">
                  <span className="inline-flex h-8 min-w-16 items-center justify-center rounded-lg border border-slate-300 bg-white/75 px-2 text-[0.7rem] font-bold text-slate-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100">
                    {ROTULOS_SITUACAO[situacao]}
                  </span>
                </td>
                {componentes.map((componente) => {
                  const categoria = estudante.marcacoes[componente.codigo] || '';
                  return (
                    <td key={componente.codigo} className="border border-slate-300 p-1 text-center dark:border-white/10">
                      <button
                        type="button"
                        title={`${componente.nome}: ${categoria ? LEGENDA_CATEGORIAS[categoria as Exclude<Categoria, ''>] : 'sem marcação'}`}
                        onClick={() => alternarCategoria(estudante, componente.codigo)}
                        className={`h-8 w-8 rounded-lg border text-sm font-black transition hover:scale-105 ${
                          categoria
                            ? 'border-blue-500 bg-blue-700 text-white dark:bg-blue-500'
                            : 'border-slate-300 bg-white/70 text-slate-400 dark:border-white/10 dark:bg-slate-900/60'
                        }`}
                      >
                        {categoria || '·'}
                      </button>
                    </td>
                  );
                })}
                <td className="border border-slate-300 p-1 dark:border-white/10">
                  <input
                    aria-label={`Frequência de ${estudante.nome}`}
                    value={estudante.frequencia}
                    onChange={(event) => atualizarEstudante(estudante.id, { frequencia: event.target.value })}
                    placeholder="Ex.: 89%"
                    className="w-20 rounded-lg border border-slate-300 bg-white/80 p-1.5 dark:border-white/10 dark:bg-slate-900/80"
                  />
                </td>
                <td className="border border-slate-300 p-1 dark:border-white/10">
                  <input
                    aria-label={`Observação de ${estudante.nome}`}
                    value={estudante.observacao}
                    onChange={(event) => atualizarEstudante(estudante.id, { observacao: event.target.value })}
                    className="w-52 rounded-lg border border-slate-300 bg-white/80 p-1.5 dark:border-white/10 dark:bg-slate-900/80"
                  />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && estudantes.length === 0 && (
        <p className="mt-5 text-slate-500 dark:text-slate-400">Nenhum estudante encontrado nesta turma.</p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {estudantes.length} estudantes · {totalMarcacoes} marcações {alterado ? '· alterações não salvas' : ''}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={gerarPdf}
            disabled={loading || estudantes.length === 0}
            className="rounded-xl border border-blue-200 px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50 dark:border-blue-400/30 dark:text-blue-200 dark:hover:bg-blue-500/10"
          >
            Gerar PDF de todas as turmas
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={loading || estudantes.length === 0 || !alterado}
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-white/10"
          >
            Salvar conselho
          </button>
        </div>
      </div>
    </section>
  );
}
