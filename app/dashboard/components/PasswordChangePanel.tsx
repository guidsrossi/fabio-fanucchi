'use client';

import { FormEvent, useState } from 'react';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useLoadingAction } from '../../hooks/useLoadingAction';
import { Usuario } from '../types';

type Props = {
  onChanged: (user: Usuario) => void;
};

export default function PasswordChangePanel({ onChanged }: Props) {
  const [form, setForm] = useState({
    novaSenha: '',
    confirmarSenha: '',
  });
  const { loading, loadingMessage, runWithLoading } = useLoadingAction();

  async function alterarSenha(e: FormEvent) {
    e.preventDefault();

    if (form.novaSenha !== form.confirmarSenha) {
      alert('As senhas digitadas nao conferem');
      return;
    }

    await runWithLoading('Salvando nova senha...', async () => {
      try {
        const response = await fetch('/api/alterar-senha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novaSenha: form.novaSenha }),
        });

        const data = await response.json();

        if (data.success) {
          alert('Senha alterada com sucesso!');
          setForm({ novaSenha: '', confirmarSenha: '' });
          onChanged(data.user);
          return;
        }

        alert(data.error || 'Erro ao alterar senha');
      } catch {
        alert('Erro ao alterar senha');
      }
    });
  }

  return (
    <>
      <LoadingOverlay show={loading} message={loadingMessage} />

      <section className="mb-6 rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <h2 className="mb-2 text-xl font-bold text-slate-950 dark:text-white">
          Troque sua senha para continuar
        </h2>
        <p className="mb-4 text-slate-500 dark:text-slate-400">
          Sua conta comecou com senha temporaria. Cadastre uma nova senha no primeiro acesso.
        </p>

        <form onSubmit={alterarSenha} className="grid max-w-md gap-4">
          <input
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            type="password"
            minLength={6}
            placeholder="Nova senha"
            value={form.novaSenha}
            onChange={(e) => setForm({ ...form, novaSenha: e.target.value })}
            required
          />

          <input
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            type="password"
            minLength={6}
            placeholder="Confirmar nova senha"
            value={form.confirmarSenha}
            onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })}
            required
          />

          <button
            disabled={loading}
            className="rounded-xl bg-blue-700 p-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-white/10"
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </section>
    </>
  );
}
