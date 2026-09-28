'use client';

import { useState } from 'react';
import LoadingOverlay from './components/LoadingOverlay';
import { useLoadingAction } from './hooks/useLoadingAction';

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0 17.9 17.9 0 0 1-15 0Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 10.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-5.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v5.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.22A10.5 10.5 0 0 0 1.93 12c1.4 4.06 5.35 6.75 10.07 6.75 1 0 1.96-.12 2.86-.35M6.23 6.23A10.45 10.45 0 0 1 12 4.5c4.72 0 8.67 2.69 10.07 6.75a10.5 10.5 0 0 1-2.3 4.04M6.23 6.23 3 3m3.23 3.23 3.12 3.12m8.42 8.42L21 21m-3.23-3.23-3.12-3.12m0 0a3.75 3.75 0 1 0-5.3-5.3m5.3 5.3-5.3-5.3" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.04 12.32a1 1 0 0 1 0-.64C3.42 7.51 7.35 4.5 12 4.5s8.58 3.01 9.96 7.18a1 1 0 0 1 0 .64C20.58 16.49 16.65 19.5 12 19.5S3.42 16.49 2.04 12.32Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

export default function LoginPage() {
  const [loginUsuario, setLoginUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const { loading, loadingMessage, runWithLoading } = useLoadingAction();

  async function login(e: React.FormEvent) {
    e.preventDefault();

    await runWithLoading('Entrando...', async () => {
      setErro('');

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: loginUsuario, senha }),
        });

        const data = await response.json();

        if (!data.success) {
          setErro(data.error || 'Erro ao entrar');
          return;
        }

        window.location.href = '/dashboard';
      } catch {
        setErro('Erro ao entrar');
      }
    });
  }

  return (
    <main className="login-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      <LoadingOverlay show={loading} message={loadingMessage} />

      <div className="login-orb login-orb-one" aria-hidden="true" />
      <div className="login-orb login-orb-two" aria-hidden="true" />
      <div className="login-grid" aria-hidden="true" />

      <section className="login-shell relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_30px_80px_-30px_rgba(15,42,87,0.4)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr] dark:border-white/10 dark:bg-slate-950/80">
        <div className="login-brand-panel relative hidden min-h-[650px] overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="brand-glow" aria-hidden="true" />
          <div className="brand-rings" aria-hidden="true"><span /><span /><span /></div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-blue-950/20">
              <img src="/school-logo.jpg" alt="" className="h-full w-full rounded-xl object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Escola Estadual</p>
              <p className="text-sm text-blue-100">Prof. Fabio Fanucchi</p>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide text-blue-50 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
              Plataforma de acompanhamento
            </span>
            <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight xl:text-5xl">
              Educação que<br />
              <span className="text-blue-200">acolhe e transforma.</span>
            </h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-blue-100/80">
              Um espaço para acompanhar, orientar e fortalecer cada trajetória escolar.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-sm text-blue-100/75">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10">
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4m5.6-3.4A11.95 11.95 0 0 1 12 3a11.95 11.95 0 0 1-8.6 3.6c-.09.78-.15 1.58-.15 2.4 0 5.55 3.81 10.21 8.96 11.52 5.15-1.31 8.96-5.97 8.96-11.52 0-.82-.06-1.62-.17-2.4Z" />
              </svg>
            </span>
            Ambiente seguro para a comunidade escolar
          </div>
        </div>

        <div className="login-form-panel flex min-h-[620px] items-center px-6 py-10 sm:px-12 lg:min-h-[650px] lg:px-14">
          <form onSubmit={login} className="w-full">
            <div className="mb-8">
              <div className="mb-5 flex items-center gap-3 lg:hidden">
                <img src="/school-logo.jpg" alt="Escola Estadual Prof. Fabio Fanucchi" className="h-14 w-14 rounded-2xl border border-slate-200 bg-white object-cover p-1 shadow-sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Escola Estadual</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Prof. Fabio Fanucchi</p>
                </div>
              </div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-400">Bem-vindo de volta</p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Acesse sua conta</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Entre com suas credenciais para continuar.</p>
            </div>

            {erro && (
              <div role="alert" aria-live="polite" className="login-error mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <svg aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
                </svg>
                <span>{erro}</span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="login" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Login</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><UserIcon /></span>
                  <input id="login" name="login" className="login-input" type="text" value={loginUsuario} onChange={(e) => setLoginUsuario(e.target.value)} placeholder="Digite seu login" autoComplete="username" autoFocus required />
                </div>
              </div>

              <div>
                <label htmlFor="senha" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Senha</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><LockIcon /></span>
                  <input id="senha" name="senha" className="login-input pr-12" type={mostrarSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required />
                  <button type="button" onClick={() => setMostrarSenha((valor) => !valor)} className="login-password-toggle" aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha}>
                    <EyeIcon hidden={mostrarSenha} />
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="login-submit mt-7 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              <span>{loading ? 'Entrando...' : 'Entrar na plataforma'}</span>
              {!loading && (
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              )}
            </button>

            <p className="mt-8 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">Acesso exclusivo para profissionais autorizados</p>
          </form>
        </div>
      </section>
    </main>
  );
}
