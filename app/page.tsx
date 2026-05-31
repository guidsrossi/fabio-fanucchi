'use client';

import { useEffect, useState } from 'react';

const ESCOLA = 'Escola Estadual Prof. Fabio Fanucchi';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [temaEscuro, setTemaEscuro] = useState(false);

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

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });

    const data = await response.json();

    if (!data.success) {
      setErro(data.error || 'Erro ao entrar');
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={alternarTema}
            className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-400"
          >
            {temaEscuro ? 'Tema claro' : 'Tema dark'}
          </button>
        </div>

        <section className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/92 shadow-2xl shadow-blue-950/10 backdrop-blur dark:border-white/10 dark:bg-slate-950/88 dark:shadow-black/30">
          <div className="border-b border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 text-center dark:border-white/10 dark:from-slate-900 dark:to-slate-950">
            <img
              src="/school-logo.jpg"
              alt={ESCOLA}
              className="mx-auto h-24 w-24 rounded-3xl border border-slate-200 bg-white object-contain p-2 shadow-sm dark:border-white/10 dark:bg-white"
            />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              Sistema de Tutoria
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-950 dark:text-white">
              {ESCOLA}
            </h1>
          </div>

          <form onSubmit={login} className="p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                Entrar no sistema
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Acesse para registrar, acompanhar e validar os apoios presenciais.
              </p>
            </div>

            {erro && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {erro}
              </div>
            )}

            <label className="mb-2 block font-medium text-slate-700 dark:text-slate-200">
              Login
            </label>
            <input
              className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-950 transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu login"
            />

            <label className="mb-2 block font-medium text-slate-700 dark:text-slate-200">
              Senha
            </label>
            <input
              className="mb-6 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-950 transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
            />

            <button className="w-full rounded-xl bg-blue-700 p-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400">
              Entrar
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
