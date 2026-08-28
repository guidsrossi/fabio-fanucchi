'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useLoadingAction } from '../../hooks/useLoadingAction';
import { Usuario, isGestao } from '../types';
import LancamentoManualTutorias from './LancamentoManualTutorias';

type EstudanteOpcao = { id: string; nome: string; turma: string };
type ProfessorOpcao = { id: string; nome: string };
type FichaTutoria = {
  id: string; data: string; mes: string; estudante_id: string; estudante_nome: string;
  professor_id: string; professor_nome: string; turma: string; relato: string;
  criado_em: string; atualizado_em: string;
};

function hojeLocal() {
  const data = new Date();
  const deslocamento = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - deslocamento).toISOString().slice(0, 10);
}

function mesAtual() {
  return hojeLocal().slice(0, 7);
}

function formatarData(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function TutoriasMensaisModule({ user }: { user: Usuario }) {
  const gestao = isGestao(user.perfil);
  const [mes, setMes] = useState(mesAtual());
  const [fichas, setFichas] = useState<FichaTutoria[]>([]);
  const [estudantes, setEstudantes] = useState<EstudanteOpcao[]>([]);
  const [professores, setProfessores] = useState<ProfessorOpcao[]>([]);
  const [estudanteId, setEstudanteId] = useState('');
  const [professorFiltro, setProfessorFiltro] = useState('');
  const [estudanteFiltro, setEstudanteFiltro] = useState('');
  const [data, setData] = useState(hojeLocal());
  const [relato, setRelato] = useState('');
  const [edicaoId, setEdicaoId] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [gerandoPdfId, setGerandoPdfId] = useState('');
  const { loading: salvando, loadingMessage, runWithLoading } = useLoadingAction();

  const carregar = useCallback(async (mesReferencia: string) => {
    setCarregando(true);
    setErro('');
    try {
      const response = await fetch(`/api/fichas-tutoria?mes=${encodeURIComponent(mesReferencia)}`);
      const resultado = await response.json();
      if (!response.ok || !resultado.success) throw new Error(resultado.error || 'Erro ao carregar fichas');
      setFichas(resultado.fichas || []);
      setEstudantes(resultado.estudantes || []);
      setProfessores(resultado.professores || []);
      setEstudanteId((atual) => atual || resultado.estudantes?.[0]?.id || '');
    } catch (error) {
      setFichas([]);
      setErro(error instanceof Error ? error.message : 'Erro ao carregar fichas de tutoria');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar(mes);
  }, [carregar, mes]);

  const fichasFiltradas = useMemo(
    () => fichas.filter((ficha) =>
      (!professorFiltro || ficha.professor_id === professorFiltro) &&
      (!estudanteFiltro || ficha.estudante_id === estudanteFiltro)
    ),
    [estudanteFiltro, fichas, professorFiltro]
  );
  const estudantesAtendidos = useMemo(
    () => new Set(fichasFiltradas.map((ficha) => ficha.estudante_id)).size,
    [fichasFiltradas]
  );
  const quantidades = useMemo(
    () => estudantes.map((estudante) => ({
      ...estudante,
      quantidade: fichas.filter((ficha) => ficha.estudante_id === estudante.id).length,
    })),
    [estudantes, fichas]
  );

  function limparFormulario() {
    setEdicaoId('');
    setData(hojeLocal());
    setRelato('');
  }

  function iniciarEdicao(ficha: FichaTutoria) {
    setEdicaoId(ficha.id);
    setEstudanteId(ficha.estudante_id);
    setData(ficha.data);
    setRelato(ficha.relato);
    setMensagem('');
    setErro('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function gerarPdfTutorias(estudante: EstudanteOpcao) {
    setGerandoPdfId(estudante.id);
    setErro('');
    try {
      const response = await fetch(
        `/api/fichas-tutoria?estudante_id=${encodeURIComponent(estudante.id)}`
      );
      const resultado = await response.json();
      if (!response.ok || !resultado.success) {
        throw new Error(resultado.error || 'Não foi possível carregar as fichas');
      }

      const fichasDoEstudante = Array.isArray(resultado.fichas) ? resultado.fichas : [];
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const margem = 16;
      const largura = 210 - margem * 2;
      let y = 18;
      const cabecalho = () => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
        pdf.text('Fichas de Tutoria', margem, y);
        y += 8;
        pdf.setFontSize(11);
        pdf.text(estudante.nome, margem, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Turma: ${estudante.turma} | Total de fichas: ${fichasDoEstudante.length}`, margem, y);
        y += 10;
      };

      cabecalho();
      fichasDoEstudante.forEach((ficha: FichaTutoria, index: number) => {
        const linhasRelato = pdf.splitTextToSize(String(ficha.relato || ''), largura - 6);
        if (y + 18 + linhasRelato.length * 5 > 280) {
          pdf.addPage();
          y = 18;
          cabecalho();
        }
        pdf.setDrawColor(203, 213, 225);
        pdf.line(margem, y, 210 - margem, y);
        y += 6;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(`${index + 1}. ${formatarData(ficha.data)} - ${ficha.professor_nome || 'Tutor'}`, margem, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.text(linhasRelato, margem + 3, y);
        y += linhasRelato.length * 5 + 7;
      });
      if (!fichasDoEstudante.length) {
        pdf.text('Nenhuma ficha de tutoria registrada para este estudante.', margem, y);
      }
      const nomeArquivo = estudante.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      pdf.save(`fichas-tutoria-${nomeArquivo}.pdf`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao gerar o PDF das tutorias.');
    } finally {
      setGerandoPdfId('');
    }
  }

  async function salvarFicha(event: FormEvent) {
    event.preventDefault();
    if (!estudanteId || !data || !relato.trim()) {
      setErro('Selecione o tutorado, informe a data e descreva a conversa.');
      return;
    }

    await runWithLoading(edicaoId ? 'Atualizando ficha...' : 'Salvando ficha...', async () => {
      setErro('');
      setMensagem('');
      try {
        const response = await fetch('/api/fichas-tutoria', {
          method: edicaoId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: edicaoId, estudante_id: estudanteId, data, relato }),
        });
        const resultado = await response.json();
        if (!response.ok || !resultado.success) throw new Error(resultado.error || 'Erro ao salvar ficha');

        const estavaEditando = Boolean(edicaoId);
        const mesDaFicha = data.slice(0, 7);
        limparFormulario();
        setMensagem(estavaEditando ? 'Ficha atualizada e contagem mensal recalculada.' : 'Ficha salva e contabilizada no mês.');
        if (mesDaFicha !== mes) setMes(mesDaFicha);
        else await carregar(mes);
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Erro ao salvar ficha de tutoria');
      }
    });
  }

  return (
    <section className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
      <LoadingOverlay show={salvando} message={loadingMessage} />

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">Registro mensal</p>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Fichas de tutoria</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {gestao ? 'Consulte as fichas registradas por todos os professores.' : 'Registre o que foi conversado. Cada ficha conta como uma tutoria no mês da data informada.'}
          </p>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Mês de referência
          <input type="month" value={mes} onChange={(event) => setMes(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
        </label>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-sm text-slate-500 dark:text-slate-400">Tutorias no mês</p><strong className="mt-1 block text-2xl">{fichasFiltradas.length}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-sm text-slate-500 dark:text-slate-400">Estudantes atendidos</p><strong className="mt-1 block text-2xl">{estudantesAtendidos}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-sm text-slate-500 dark:text-slate-400">Estudantes disponíveis</p><strong className="mt-1 block text-2xl">{estudantes.length}</strong></div>
      </div>

      {mensagem ? <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">{mensagem}</div> : null}
      {erro ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{erro}</div> : null}

      {!gestao ? <LancamentoManualTutorias /> : null}

      {!gestao ? (
        <form onSubmit={salvarFicha} className="mb-6 grid gap-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-400/20 dark:bg-blue-500/5 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-950 dark:text-white">{edicaoId ? 'Editar ficha' : 'Nova ficha de tutoria'}</h3>
            {edicaoId ? <button type="button" onClick={limparFormulario} className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cancelar edição</button> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_190px]">
            <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tutorado
              <select value={estudanteId} onChange={(event) => setEstudanteId(event.target.value)} disabled={Boolean(edicaoId)} required className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-white">
                <option value="">Selecione</option>
                {estudantes.map((estudante) => <option key={estudante.id} value={estudante.id}>{estudante.nome} - {estudante.turma}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Data
              <input type="date" value={data} onChange={(event) => setData(event.target.value)} required className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">O que foi conversado durante a tutoria?
            <textarea value={relato} onChange={(event) => setRelato(event.target.value)} required rows={6} maxLength={5000} placeholder="Registre os assuntos tratados, orientações e encaminhamentos..." className="resize-y rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
            <span className="text-right text-xs font-normal text-slate-500">{relato.length}/5000</span>
          </label>
          <button disabled={salvando || carregando || estudantes.length === 0} className="w-fit rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500">{edicaoId ? 'Atualizar ficha' : 'Salvar ficha'}</button>
        </form>
      ) : (
        <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="grid gap-2 text-sm font-semibold">Professor
            <select value={professorFiltro} onChange={(event) => setProfessorFiltro(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><option value="">Todos</option>{professores.map((professor) => <option key={professor.id} value={professor.id}>{professor.nome}</option>)}</select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">Estudante
            <select value={estudanteFiltro} onChange={(event) => setEstudanteFiltro(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><option value="">Todos</option>{estudantes.map((estudante) => <option key={estudante.id} value={estudante.id}>{estudante.nome} - {estudante.turma}</option>)}</select>
          </label>
          <button
            type="button"
            disabled={!estudanteFiltro || Boolean(gerandoPdfId)}
            onClick={() => {
              const estudante = estudantes.find((item) => item.id === estudanteFiltro);
              if (estudante) gerarPdfTutorias(estudante);
            }}
            className="rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50 dark:bg-blue-500"
          >
            {gerandoPdfId ? 'Gerando PDF...' : 'Gerar PDF do estudante'}
          </button>
        </div>
      )}

      {!gestao && quantidades.length ? (
        <div className="mb-6">
          <h3 className="mb-3 font-bold">Quantidade automática por tutorado</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {quantidades.map((estudante) => <div key={estudante.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10"><div><p className="font-semibold">{estudante.nome}</p><p className="text-sm text-slate-500">{estudante.turma}</p></div><div className="flex items-center gap-2"><strong className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">{estudante.quantidade}</strong><button type="button" onClick={() => gerarPdfTutorias(estudante)} disabled={Boolean(gerandoPdfId)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50 dark:border-blue-400/30 dark:text-blue-200">{gerandoPdfId === estudante.id ? 'Gerando...' : 'PDF'}</button></div></div>)}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Fichas do mês</h3><button type="button" onClick={() => carregar(mes)} disabled={carregando} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-white/10">Recarregar</button></div>
        <div className="grid gap-3">
          {fichasFiltradas.map((ficha) => (
            <article key={ficha.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-bold text-slate-950 dark:text-white">{ficha.estudante_nome}</p><p className="text-sm text-slate-500 dark:text-slate-400">{ficha.turma} • {formatarData(ficha.data)}{gestao ? ` • ${ficha.professor_nome}` : ''}</p></div>
                {!gestao ? <button type="button" onClick={() => iniciarEdicao(ficha)} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 dark:border-blue-400/30 dark:text-blue-200">Editar</button> : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-200">{ficha.relato}</p>
            </article>
          ))}
          {carregando ? <p className="text-slate-500">Carregando fichas...</p> : null}
          {!carregando && fichasFiltradas.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-slate-500 dark:bg-white/[0.03]">Nenhuma ficha encontrada neste mês.</p> : null}
        </div>
      </div>
    </section>
  );
}
