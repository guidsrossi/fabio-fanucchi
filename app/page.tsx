'use client';

import { useState } from 'react';
import LoadingOverlay from './components/LoadingOverlay';
import { useLoadingAction } from './hooks/useLoadingAction';

export default function LoginPage() {
  const [loginUsuario, setLoginUsuario] = useState('');
  const [senha, setSenha] = useState('');
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
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <LoadingOverlay show={loading} message={loadingMessage} />

      <form
        onSubmit={login}
        className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/90 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur sm:p-8 dark:border-white/10 dark:bg-slate-950/88 dark:shadow-black/30"
      >
        <div className="mb-7 text-center">
          <img
            src="/school-logo.jpg"
            alt="Escola Estadual Prof. Fabio Fanucchi"
            className="mx-auto h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
          />
          <h1 className="mt-3 text-lg font-semibold leading-tight text-slate-900 dark:text-white">
            Escola Estadual Prof. Fabio Fanucchi
          </h1>
        </div>

        {erro && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
          >
            {erro}
          </div>
        )}

        <label
          htmlFor="login"
          className="mb-2 block font-medium text-slate-700 dark:text-slate-200"
        >
          Login
        </label>
        <input
          id="login"
          name="login"
          className="mb-5 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-950 transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
          type="text"
          value={loginUsuario}
          onChange={(e) => setLoginUsuario(e.target.value)}
          autoComplete="username"
          required
        />

        <label
          htmlFor="senha"
          className="mb-2 block font-medium text-slate-700 dark:text-slate-200"
        >
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          className="mb-6 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-950 transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-700 p-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-white/10"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
