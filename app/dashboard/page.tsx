'use client';

import { useEffect, useState } from 'react';
import LoadingOverlay from '../components/LoadingOverlay';
import { useLoadingAction } from '../hooks/useLoadingAction';
import GestaoEscolarModule from './components/GestaoEscolarModule';
import ConselhoClasseModule from './components/ConselhoClasseModule';
import NotasBimestraisModule from './components/NotasBimestraisModule';
import ModuleSelector, {
  defaultModuleForUser,
  moduleIsAvailable,
} from './components/ModuleSelector';
import PasswordChangePanel from './components/PasswordChangePanel';
import RelatoriosTutoriasModule from './components/RelatoriosTutoriasModule';
import TutoriasMensaisModule from './components/TutoriasMensaisModule';
import {
  Apoio,
  DashboardModuleId,
  Estudante,
  Pergunta,
  Professor,
  Usuario,
  VinculosPorProfessor,
  isCoordenador,
  isGestao,
  isProfessor,
} from './types';

const ESCOLA = 'Escola Estadual Prof. Fabio Fanucchi';

export default function DashboardPage() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [activeModule, setActiveModule] = useState<DashboardModuleId>('notas-bimestrais');
  const [apoios, setApoios] = useState<Apoio[]>([]);
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [estudantesVinculo, setEstudantesVinculo] = useState<Estudante[]>([]);
  const [vinculosPorProfessor, setVinculosPorProfessor] = useState<VinculosPorProfessor>({});
  const [temaEscuro, setTemaEscuro] = useState(false);
  const { loading, loadingMessage, runWithLoading } = useLoadingAction();

  useEffect(() => {
    const temaSalvo = localStorage.getItem('tema');
    const usarEscuro =
      temaSalvo === 'dark' ||
      (!temaSalvo && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setTemaEscuro(usarEscuro);
    document.documentElement.classList.toggle('dark', usarEscuro);
  }, []);

  function alternarTema() {
    const proximoTema = !temaEscuro;

    setTemaEscuro(proximoTema);
    localStorage.setItem('tema', proximoTema ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', proximoTema);
  }

  async function carregar() {
    const me = await fetch('/api/me').then((r) => r.json());

    if (!me.success) {
      window.location.href = '/';
      return;
    }

    const usuario = me.user as Usuario;
    setUser(usuario);
    setActiveModule((moduloAtual) =>
      moduleIsAvailable(usuario, moduloAtual) ? moduloAtual : defaultModuleForUser(usuario)
    );

    if (usuario.precisa_trocar_senha) {
      setApoios([]);
      setEstudantes([]);
      setPerguntas([]);
      setProfessores([]);
      setEstudantesVinculo([]);
      setVinculosPorProfessor({});
      return;
    }

    if (isGestao(usuario.perfil)) {
      const [apoiosResp, perguntasResp, professoresResp] = await Promise.all([
        fetch('/api/apoios').then((r) => r.json()),
        fetch('/api/perguntas').then((r) => r.json()),
        fetch('/api/professores').then((r) => r.json()),
      ]);

      setApoios(apoiosResp.apoios || []);
      setPerguntas(perguntasResp.perguntas || []);
      setProfessores(professoresResp.professores || []);
      setEstudantesVinculo(professoresResp.estudantes || []);
      setVinculosPorProfessor(professoresResp.vinculosPorProfessor || {});
      setEstudantes([]);
      return;
    }

    setApoios([]);
    setPerguntas([]);

    if (isProfessor(usuario.perfil)) {
      const estudantesResp = await fetch('/api/estudantes').then((r) => r.json());
      setEstudantes(estudantesResp.estudantes || []);
      return;
    }

    setEstudantes([]);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function sair() {
    await runWithLoading('Saindo...', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/';
    });
  }

  function renderModule() {
    if (!user) return null;

    if (activeModule === 'tutorias' && (isProfessor(user.perfil) || isGestao(user.perfil))) {
      return <TutoriasMensaisModule user={user} />;
    }

    if (activeModule === 'conselho' && isCoordenador(user.perfil)) {
      return <ConselhoClasseModule />;
    }

    if (activeModule === 'notas-bimestrais') {
      return <NotasBimestraisModule />;
    }

    if (activeModule === 'relatorios' && isGestao(user.perfil)) {
      return <RelatoriosTutoriasModule />;
    }

    if (activeModule === 'gestao' && isGestao(user.perfil)) {
      return (
        <GestaoEscolarModule
          apoios={apoios}
          professores={professores}
          estudantes={estudantesVinculo}
          perguntas={perguntas}
          vinculosPorProfessor={vinculosPorProfessor}
          onReload={carregar}
        />
      );
    }

    return <NotasBimestraisModule />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-slate-600 dark:text-slate-300">
        Carregando...
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <LoadingOverlay show={loading} message={loadingMessage} />

      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:shadow-black/20 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src="/school-logo.jpg"
                alt={ESCOLA}
                className="h-16 w-16 flex-none rounded-2xl border border-slate-200 object-cover shadow-sm dark:border-white/10"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                  {ESCOLA}
                </p>
                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                  Plataforma de Tutoria Escolar
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Logado como {user.nome} - {user.perfil}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={alternarTema}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-400"
              >
                {temaEscuro ? 'Tema claro' : 'Tema dark'}
              </button>
              <button
                disabled={loading}
                onClick={sair}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white shadow-lg shadow-red-600/15 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {user.precisa_trocar_senha ? (
          <PasswordChangePanel
            onChanged={(usuarioAtualizado) => {
              setUser(usuarioAtualizado);
              carregar();
            }}
          />
        ) : (
          <>
            <ModuleSelector
              activeModule={activeModule}
              user={user}
              onChange={setActiveModule}
            />
            {renderModule()}
          </>
        )}
      </div>
    </main>
  );
}
