'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Nota = {
  disciplina?: string;
  materia?: string;
  nome?: string;
  nota?: string | number | null;
  bimestre?: string | number;
};

type EstudanteNotas = {
  id: string;
  nome: string;
  turma: string;
  serie: string;
  tutor: string;
  frequencia: string | number;
  notas: Nota[];
  foto: null | { url?: string; nomeArquivo?: string };
  tutorias_bimestre?: number;
};

function normalizar(texto: unknown) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((palavra) => palavra && !['DE', 'DA', 'DO', 'DAS', 'DOS', 'E'].includes(palavra))
    .join(' ');
}

function parseNota(valor: unknown) {
  if (valor === null || valor === undefined || valor === '' || valor === '-') return null;
  const nota = Number(String(valor).replace(',', '.'));
  return Number.isFinite(nota) ? nota : null;
}

function formatarNota(nota: number) {
  return Number.isInteger(nota) ? String(nota) : String(nota).replace('.', ',');
}

function formatarFrequencia(valor: unknown) {
  const bruto = String(valor ?? '').trim();
  if (!bruto || bruto === '-') return null;
  const numero = Number(bruto.replace('%', '').replace(',', '.'));
  if (!Number.isFinite(numero)) return { texto: bruto, valor: null };
  const percentual = bruto.includes('%') || numero > 1 ? numero : numero * 100;
  return {
    texto: `${Number.isInteger(percentual) ? percentual : percentual.toFixed(1).replace('.', ',')}%`,
    valor: percentual,
  };
}

function adaptarEstudante(student: any, index: number): EstudanteNotas {
  const turma = String(student.turma || student.sala || student.serie || '');
  return {
    id: String(student.id || `${turma}-${index + 1}`),
    nome: String(student.nome || student.nomeAluno || student.aluno || ''),
    turma,
    serie: String(student.serie || turma),
    tutor: String(student.tutor || student.professor || ''),
    frequencia: student.frequencia ?? student.frequency ?? '',
    notas: Array.isArray(student.notas) ? student.notas : [],
    foto: student.foto && typeof student.foto === 'object' ? student.foto : null,
    tutorias_bimestre:
      student.tutorias_bimestre === undefined ? undefined : Number(student.tutorias_bimestre),
  };
}

export default function NotasBimestraisModule() {
  const [estudantes, setEstudantes] = useState<EstudanteNotas[]>([]);
  const [turma, setTurma] = useState('');
  const [bimestre, setBimestre] = useState(1);
  const [busca, setBusca] = useState('');
  const [indice, setIndice] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [status, setStatus] = useState('Carregando dados do Google Planilhas e Drive...');
  const apresentacaoRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setStatus('Carregando dados do Google Planilhas e Drive...');

    try {
      const response = await fetch(`/api/notas-bimestrais?bimestre=${bimestre}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Erro ao carregar os dados');

      const lista = (data.students || [])
        .map(adaptarEstudante)
        .filter((student: EstudanteNotas) => student.nome && student.turma);
      setEstudantes(lista);
      setIndice(0);
      setStatus(`${lista.length} estudante(s) carregado(s) para o ${bimestre}º bimestre.`);
    } catch (error) {
      setEstudantes([]);
      setStatus(error instanceof Error ? error.message : 'Erro ao carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, [bimestre]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const turmas = useMemo(
    () => Array.from(new Set(estudantes.map((student) => student.turma))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { numeric: true })
    ),
    [estudantes]
  );

  const filtrados = useMemo(() => {
    const consulta = normalizar(busca);
    return estudantes.filter(
      (student) => (!turma || student.turma === turma) && (!consulta || normalizar(student.nome).includes(consulta))
    );
  }, [busca, estudantes, turma]);

  useEffect(() => setIndice(0), [busca, turma]);

  const estudante = filtrados.length ? filtrados[indice % filtrados.length] : null;
  const navegar = useCallback(
    (direcao: number) => {
      if (!filtrados.length) return;
      setIndice((atual) => (atual + direcao + filtrados.length) % filtrados.length);
    },
    [filtrados.length]
  );

  useEffect(() => {
    const teclado = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') navegar(1);
      if (event.key === 'ArrowLeft') navegar(-1);
    };
    document.addEventListener('keydown', teclado);
    return () => document.removeEventListener('keydown', teclado);
  }, [navegar]);

  const notasDoBimestre = (estudante?.notas || []).filter((nota) => {
    const notasPossuemBimestre = (estudante?.notas || []).some((item) => item.bimestre !== undefined);
    return !notasPossuemBimestre || Number(nota.bimestre) === bimestre;
  });
  const notasValidas = notasDoBimestre
    .map((item) => ({ disciplina: item.disciplina || item.materia || item.nome || '', nota: parseNota(item.nota) }))
    .filter((item): item is { disciplina: string; nota: number } => Boolean(item.disciplina) && item.nota !== null);
  const notasBaixas = notasValidas.filter((item) => item.nota < 7);
  const todasAcima = notasValidas.length > 0 && notasValidas.every((item) => item.nota >= 7);
  const frequencia = formatarFrequencia(estudante?.frequencia);

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-xl shadow-blue-950/5 dark:border-white/10 dark:bg-slate-950/80">
      {carregando && (
        <div className="absolute inset-0 z-20 flex min-h-96 flex-col items-center justify-center gap-4 bg-slate-950/90 text-white">
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-sky-400" />
          <p className="font-bold">Carregando estudantes...</p>
        </div>
      )}

      <div className="border-b border-slate-200 p-5 dark:border-white/10 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">Acompanhamento pedagógico</p>
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Notas Bimestrais</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Notas, frequência e apresentação individual dos estudantes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => apresentacaoRef.current?.requestFullscreen()} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:border-blue-300 dark:border-white/10 dark:text-slate-200">Tela cheia</button>
            <button type="button" onClick={() => navegar(-1)} disabled={!filtrados.length} className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-800 disabled:opacity-50 dark:bg-white/10 dark:text-white">← Anterior</button>
            <button type="button" onClick={() => navegar(1)} disabled={!filtrados.length} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Próximo →</button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-2 xl:grid-cols-[180px_220px_1fr_auto]">
        <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Bimestre
          <select value={bimestre} onChange={(event) => setBimestre(Number(event.target.value))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white">
            {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º bimestre</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Turma
          <select value={turma} onChange={(event) => setTurma(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white">
            <option value="">Todas as turmas</option>
            {turmas.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Buscar aluno
          <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Digite o nome..." className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
        </label>
        <div className="flex items-end"><button type="button" onClick={carregar} disabled={carregando} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">Atualizar dados</button></div>
        <p className="text-sm text-slate-500 dark:text-slate-400 md:col-span-2 xl:col-span-4" role="status">{status}</p>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="max-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex justify-between border-b border-slate-200 p-4 font-semibold dark:border-white/10"><span>Alunos</span><span>{filtrados.length}</span></div>
          <div className="max-h-[560px] overflow-auto p-2">
            {filtrados.map((student, index) => (
              <button key={`${student.id}-${index}`} type="button" onClick={() => setIndice(index)} className={`mb-2 block w-full rounded-xl border p-3 text-left transition ${index === indice % Math.max(filtrados.length, 1) ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-900 hover:border-blue-300 dark:border-white/10 dark:bg-slate-900 dark:text-white'}`}>
                <strong className="block">{student.nome}</strong><small className="mt-1 block opacity-75">{student.serie} • Turma {student.turma}</small>{student.tutor && <small className="block opacity-75">Tutor(a): {student.tutor}</small>}
              </button>
            ))}
          </div>
        </aside>

        <div ref={apresentacaoRef} className="grid min-h-[520px] gap-5 overflow-auto rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-5 text-white shadow-2xl sm:p-7 md:grid-cols-[minmax(210px,32%)_1fr] md:grid-rows-[auto_1fr] md:[grid-template-areas:'header_header'_'photo_info'] fullscreen:min-h-screen fullscreen:rounded-none fullscreen:p-10">
          {estudante ? <>
            <div className="flex min-w-0 flex-col items-start gap-3 md:[grid-area:header] md:flex-row md:items-center">
              <span className="rounded-full bg-emerald-400 px-4 py-2 font-black text-emerald-950">{estudante.serie}</span>
              <h3 className="break-words text-4xl font-black leading-none sm:text-5xl xl:text-6xl">{estudante.nome}</h3>
            </div>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/15 bg-white/10 md:[grid-area:photo]">
              {estudante.foto?.url ? <Image loader={({ src }) => src} unoptimized fill sizes="(max-width: 768px) 100vw, 32vw" src={estudante.foto.url} alt={`Foto de ${estudante.nome}`} className="object-contain" /> : <div className="flex h-full items-center justify-center p-4 text-center text-3xl font-black uppercase text-white/50">Sem foto</div>}
            </div>
            <div className="min-w-0 md:[grid-area:info]">
              <p className="text-3xl font-black text-blue-100">Turma {estudante.turma}</p>
              {estudante.tutor && <p className="mt-2 text-2xl font-bold text-yellow-100">Tutor(a): {estudante.tutor}</p>}
              {frequencia && <span className={`mt-3 inline-flex rounded-lg px-3 py-2 text-lg font-black ${frequencia.valor !== null && frequencia.valor < 80 ? 'bg-red-100 text-red-900' : frequencia.valor !== null && frequencia.valor <= 89 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>Frequência: {frequencia.texto}</span>}
              {estudante.tutorias_bimestre !== undefined ? (
                <span className="mt-3 inline-flex rounded-lg bg-blue-100 px-3 py-2 text-lg font-black text-blue-900">
                  Tutorias no {bimestre}º bimestre: {estudante.tutorias_bimestre}
                </span>
              ) : null}
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {notasBaixas.map((item, index) => <div key={`${item.disciplina}-${index}`} className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border-l-[7px] p-3 font-black text-slate-900 shadow-lg ${item.nota <= 4 ? 'border-red-600 bg-red-100' : 'border-amber-500 bg-amber-100'}`}><strong className="break-words">{item.disciplina}</strong><span className="rounded-full bg-white px-3 py-1">{formatarNota(item.nota)}</span></div>)}
                {todasAcima && <div className="rounded-lg border-l-[7px] border-emerald-500 bg-emerald-100 p-5 text-center text-xl font-black text-emerald-900 sm:col-span-2 xl:col-span-3">Parabéns, todas as suas notas estão acima do esperado</div>}
              </div>
            </div>
          </> : <div className="flex items-center justify-center text-center text-3xl font-bold md:col-span-2">Nenhum aluno encontrado</div>}
        </div>
      </div>
      <p className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400">Dica: use as setas do teclado para avançar ou voltar.</p>
    </section>
  );
}
