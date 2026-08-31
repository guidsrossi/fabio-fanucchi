'use client';

import { useEffect, useState } from 'react';
import { disciplinasDaTurma } from '@/lib/disciplinas-tutoria';

type Estudante = { id: string; nome: string; turma: string };
type Bimestre = { meta: string; nota: string; frequencia: string };
type Linha = { disciplina: string; bimestres: Bimestre[] };
type Ficha = {
  ra: string; dataNascimento: string; projetoVida: string; hobby: string;
  clube1: string; clube2: string; liderTurma: boolean; liderClube: boolean;
  gremista: boolean; responsaveis: string; gerais: Linha[]; tecnicas: Linha[];
  plataformas: Linha[]; anotacoesFinais: string;
};

const BIMESTRES = [1, 2, 3, 4];
const PLATAFORMAS = ['Khan', 'Leia', 'Alura', 'Tarefas', 'Speak'];

function linhas(nomes: string[]): Linha[] {
  return nomes.map((disciplina) => ({ disciplina, bimestres: BIMESTRES.map(() => ({ meta: '', nota: '', frequencia: '' })) }));
}

function fichaVazia(turma = ''): Ficha {
  const disciplinas = disciplinasDaTurma(turma);
  return { ra: '', dataNascimento: '', projetoVida: '', hobby: '', clube1: '', clube2: '', liderTurma: false, liderClube: false, gremista: false, responsaveis: '', gerais: linhas(disciplinas.gerais), tecnicas: linhas(disciplinas.itinerario), plataformas: linhas(PLATAFORMAS), anotacoesFinais: '' };
}

function normalizar(valor: string) { return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

function reconciliar(modelo: Linha[], salvas?: Linha[]) {
  const porNome = new Map((salvas || []).map((linha) => [normalizar(linha.disciplina), linha]));
  return modelo.map((linha) => porNome.get(normalizar(linha.disciplina)) || linha);
}

function mesclarFicha(dados: Partial<Ficha>, turma: string): Ficha {
  const base = fichaVazia(turma);
  return { ...base, ...dados, gerais: reconciliar(base.gerais, dados.gerais), tecnicas: reconciliar(base.tecnicas, dados.tecnicas), plataformas: reconciliar(base.plataformas, dados.plataformas) };
}

function Tabela({ titulo, dados, onChange, disabled }: { titulo: string; dados: Linha[]; onChange: (linhas: Linha[]) => void; disabled: boolean }) {
  const [bimestreMobile, setBimestreMobile] = useState(0);

  function alterar(linha: number, bimestre: number, campo: keyof Bimestre, valor: string) {
    const copia = dados.map((item) => ({ ...item, bimestres: item.bimestres.map((b) => ({ ...b })) }));
    copia[linha].bimestres[bimestre][campo] = valor;
    onChange(copia);
  }
  const campoMobile = (linha: Linha, indiceLinha: number, campo: keyof Bimestre, rotulo: string) => (
    <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {rotulo}
      <input
        aria-label={`${linha.disciplina}, ${bimestreMobile + 1}º bimestre, ${rotulo}`}
        disabled={disabled}
        inputMode="decimal"
        value={linha.bimestres[bimestreMobile]?.[campo] || ''}
        onChange={(event) => alterar(indiceLinha, bimestreMobile, campo, event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-950 disabled:opacity-70 dark:border-white/10 dark:bg-slate-900 dark:text-white"
      />
    </label>
  );

  return <div className="rounded-2xl border border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/[0.02]">
    <div className="grid gap-3 border-b border-slate-200 p-3 dark:border-white/10 md:hidden">
      <h4 className="font-bold text-slate-950 dark:text-white">{titulo}</h4>
      <label className="grid gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
        Bimestre para preencher
        <select value={bimestreMobile} onChange={(event) => setBimestreMobile(Number(event.target.value))} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white">
          {BIMESTRES.map((bimestre, indice) => <option key={bimestre} value={indice}>{bimestre}º bimestre</option>)}
        </select>
      </label>
    </div>
    <div className="grid gap-3 p-3 md:hidden">
      {dados.map((linha, indiceLinha) => (
        <article key={`${linha.disciplina}-${indiceLinha}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/70">
          <h5 className="mb-3 font-bold leading-snug text-slate-950 dark:text-white">{linha.disciplina}</h5>
          <div className="grid grid-cols-3 gap-2">
            {campoMobile(linha, indiceLinha, 'meta', 'Meta')}
            {campoMobile(linha, indiceLinha, 'nota', 'Nota')}
            {campoMobile(linha, indiceLinha, 'frequencia', 'Freq.')}
          </div>
        </article>
      ))}
    </div>
    <div className="hidden overflow-x-auto md:block">
    <table className="min-w-[920px] w-full text-sm">
      <thead className="bg-slate-100 dark:bg-white/5"><tr><th className="p-3 text-left" rowSpan={2}>{titulo}</th>{BIMESTRES.map((b) => <th key={b} className="p-2 text-center" colSpan={3}>{b}º bimestre</th>)}</tr><tr>{BIMESTRES.flatMap((b) => ['Meta', 'Nota', 'Freq.'].map((campo) => <th key={`${b}-${campo}`} className="p-2 text-center text-xs">{campo}</th>))}</tr></thead>
      <tbody>{dados.map((linha, i) => <tr key={`${linha.disciplina}-${i}`} className="border-t border-slate-200 dark:border-white/10"><td className="p-3 font-medium">{linha.disciplina}</td>{linha.bimestres.flatMap((b, bi) => (['meta', 'nota', 'frequencia'] as const).map((campo) => <td key={`${bi}-${campo}`} className="p-1"><input aria-label={`${linha.disciplina}, ${bi + 1}º bimestre, ${campo}`} disabled={disabled} value={b[campo] || ''} onChange={(e) => alterar(i, bi, campo, e.target.value)} className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center disabled:opacity-70 dark:border-white/10 dark:bg-slate-900" /></td>))}</tr>)}</tbody>
    </table>
    </div>
  </div>;
}

export default function FichaEstudantePanel({ estudantes, somenteLeitura }: { estudantes: Estudante[]; somenteLeitura: boolean }) {
  const [estudanteId, setEstudanteId] = useState('');
  const [aba, setAba] = useState<'frente' | 'verso'>('frente');
  const [ficha, setFicha] = useState<Ficha>(() => fichaVazia());
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => { if (!estudanteId && estudantes[0]) setEstudanteId(estudantes[0].id); }, [estudanteId, estudantes]);
  useEffect(() => {
    if (!estudanteId) return;
    let ativo = true;
    setCarregando(true); setMensagem('');
    fetch(`/api/ficha-tutoria-estudante?estudante_id=${encodeURIComponent(estudanteId)}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok || !j.success) throw new Error(j.error); return j; })
      .then((j) => { if (ativo) setFicha(mesclarFicha(j.ficha || {}, j.estudante?.turma || '')); })
      .catch((e) => { if (ativo) setMensagem(e instanceof Error ? e.message : 'Erro ao carregar ficha'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [estudanteId]);

  async function salvar() {
    setSalvando(true); setMensagem('');
    try {
      const r = await fetch('/api/ficha-tutoria-estudante', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estudante_id: estudanteId, dados: ficha }) });
      const j = await r.json(); if (!r.ok || !j.success) throw new Error(j.error || 'Erro ao salvar');
      setMensagem('Ficha do estudante salva com sucesso.');
    } catch (e) { setMensagem(e instanceof Error ? e.message : 'Erro ao salvar ficha'); }
    finally { setSalvando(false); }
  }

  const campo = (rotulo: string, chave: keyof Ficha, tipo = 'text') => <label className="grid gap-2 text-sm font-semibold">{rotulo}<input type={tipo} disabled={somenteLeitura} value={String(ficha[chave] || '')} onChange={(e) => setFicha((f) => ({ ...f, [chave]: e.target.value }))} className="rounded-xl border border-slate-200 bg-white p-3 disabled:opacity-70 dark:border-white/10 dark:bg-slate-900" /></label>;

  const turmaSelecionada = estudantes.find((item) => item.id === estudanteId)?.turma || '';
  const modalidade = disciplinasDaTurma(turmaSelecionada).modalidade;

  return <div className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/5 sm:p-5">
    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h3 className="text-lg font-bold text-slate-950 dark:text-white">Ficha do estudante</h3><p className="mt-1 text-sm text-slate-500">Preencha a frente e o verso da ficha digital.</p></div><label className="grid w-full gap-2 text-sm font-semibold lg:w-auto lg:min-w-80">Estudante<select value={estudanteId} onChange={(e) => setEstudanteId(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white p-3 text-base dark:border-white/10 dark:bg-slate-900"><option value="">Selecione</option>{estudantes.map((e) => <option key={e.id} value={e.id}>{e.nome} - {e.turma}</option>)}</select></label></div>
    <div className="mb-5 grid grid-cols-2 gap-2" role="tablist" aria-label="Partes da ficha"><button type="button" role="tab" aria-selected={aba === 'frente'} onClick={() => setAba('frente')} className={`min-h-12 rounded-xl px-4 py-3 font-semibold ${aba === 'frente' ? 'bg-emerald-700 text-white shadow-md' : 'bg-white dark:bg-slate-900'}`}>Frente</button><button type="button" role="tab" aria-selected={aba === 'verso'} onClick={() => setAba('verso')} className={`min-h-12 rounded-xl px-4 py-3 font-semibold ${aba === 'verso' ? 'bg-emerald-700 text-white shadow-md' : 'bg-white dark:bg-slate-900'}`}>Verso</button><p className="col-span-2 text-xs text-slate-500 sm:text-sm">Os registros de tutoria continuam logo abaixo.</p></div>
    {carregando ? <p className="p-4 text-slate-500">Carregando ficha...</p> : aba === 'frente' ? <div className="grid gap-5"><div className="grid gap-4 md:grid-cols-3">{campo('RA', 'ra')}{campo('Data de nascimento', 'dataNascimento', 'date')}{campo('Projeto de vida', 'projetoVida')}{campo('Hobby', 'hobby')}{campo('Clube juvenil — 1º semestre', 'clube1')}{campo('Clube juvenil — 2º semestre', 'clube2')}</div><div className="flex flex-wrap gap-5">{([['Líder da turma', 'liderTurma'], ['Líder de clube', 'liderClube'], ['Gremista', 'gremista']] as const).map(([r, c]) => <label key={c} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" disabled={somenteLeitura} checked={ficha[c]} onChange={(e) => setFicha((f) => ({ ...f, [c]: e.target.checked }))} />{r}</label>)}</div>{campo('Responsáveis', 'responsaveis')}<Tabela titulo="Disciplinas gerais" dados={ficha.gerais} disabled={somenteLeitura} onChange={(gerais) => setFicha((f) => ({ ...f, gerais }))} /></div> : <div className="grid gap-5"><Tabela titulo={`Itinerário formativo — ${modalidade === 'tecnico' ? 'Técnico' : modalidade === 'humanas' ? 'Humanas' : 'Exatas'}`} dados={ficha.tecnicas} disabled={somenteLeitura} onChange={(tecnicas) => setFicha((f) => ({ ...f, tecnicas }))} /><Tabela titulo="Plataformas e atividades" dados={ficha.plataformas} disabled={somenteLeitura} onChange={(plataformas) => setFicha((f) => ({ ...f, plataformas }))} /><label className="grid gap-2 text-sm font-semibold">Anotações finais<textarea rows={5} disabled={somenteLeitura} value={ficha.anotacoesFinais} onChange={(e) => setFicha((f) => ({ ...f, anotacoesFinais: e.target.value }))} className="rounded-xl border border-slate-200 bg-white p-3 disabled:opacity-70 dark:border-white/10 dark:bg-slate-900" /></label></div>}
    <div className="mt-5 grid gap-3 sm:flex sm:items-center">{!somenteLeitura ? <button type="button" onClick={salvar} disabled={salvando || carregando || !estudanteId} className="min-h-12 w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-900/15 disabled:opacity-50 sm:w-auto">{salvando ? 'Salvando...' : 'Salvar ficha do estudante'}</button> : <p className="text-sm text-slate-500">Visualização da gestão: somente leitura.</p>}{mensagem ? <p className="rounded-xl bg-white/70 p-3 text-sm font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">{mensagem}</p> : null}</div>
  </div>;
}
