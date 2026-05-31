'use client';

import { DashboardModuleId, Usuario, isGestao } from '../types';

type Props = {
  activeModule: DashboardModuleId;
  user: Usuario;
  onChange: (module: DashboardModuleId) => void;
};

const baseButton =
  'rounded-xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-blue-500/15';

export function moduleIsAvailable(user: Usuario, moduleId: DashboardModuleId) {
  if (moduleId === 'apoio') return !isGestao(user.perfil);
  if (moduleId === 'tutorias') return user.perfil === 'professor';
  if (moduleId === 'relatorios' || moduleId === 'gestao') return isGestao(user.perfil);

  return true;
}

export function defaultModuleForUser(user: Usuario): DashboardModuleId {
  if (isGestao(user.perfil)) return 'relatorios';

  return 'apoio';
}

export default function ModuleSelector({ activeModule, user, onChange }: Props) {
  const modules: Array<{
    id: DashboardModuleId | 'futuras';
    title: string;
    description: string;
    roles: string;
    enabled: boolean;
  }> = [
    {
      id: 'apoio',
      title: 'Apoio ao estudante',
      description: 'Registros, validacoes e historico da funcionalidade atual.',
      roles: 'Professor e estudante',
      enabled: !isGestao(user.perfil),
    },
    {
      id: 'tutorias',
      title: 'Registro de tutorias mensais',
      description: 'Lancamento mensal de quantidades por estudante.',
      roles: 'Professor',
      enabled: user.perfil === 'professor',
    },
    {
      id: 'relatorios',
      title: 'Relatorios e graficos',
      description: 'Indicadores consolidados de tutorias por mes, turma e professor.',
      roles: 'Gestao',
      enabled: isGestao(user.perfil),
    },
    {
      id: 'gestao',
      title: 'Gestao escolar',
      description: 'Cadastro de professores, estudantes, vinculos e perguntas.',
      roles: 'Gestao',
      enabled: isGestao(user.perfil),
    },
    {
      id: 'futuras',
      title: 'Outras funcionalidades futuras',
      description: 'Espaco reservado para novos modulos da plataforma.',
      roles: 'Em expansao',
      enabled: false,
    },
  ];

  return (
    <section className="mb-6">
      <div className="mb-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
          Dashboard principal
        </p>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">
          Modulos disponiveis
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const active = module.id === activeModule;
          const enabled = module.enabled && module.id !== 'futuras';

          return (
            <button
              key={module.id}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onChange(module.id as DashboardModuleId)}
              className={`${baseButton} ${
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-lg shadow-blue-900/10 dark:border-blue-400 dark:bg-blue-500/10 dark:text-white'
                  : 'border-white/70 bg-white/90 text-slate-900 shadow-sm hover:border-blue-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:border-blue-400/60'
              } ${enabled ? '' : 'cursor-not-allowed opacity-55'}`}
            >
              <span className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {module.roles}
              </span>
              <span className="block font-bold">{module.title}</span>
              <span className="mt-2 block text-sm leading-6 text-slate-500 dark:text-slate-400">
                {module.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
