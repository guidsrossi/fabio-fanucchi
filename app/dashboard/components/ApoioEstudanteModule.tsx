'use client';

import { FormEvent, useState } from 'react';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useLoadingAction } from '../../hooks/useLoadingAction';
import { Apoio, Estudante, Pergunta, Usuario, isGestao } from '../types';

type Props = {
  user: Usuario;
  apoios: Apoio[];
  estudantes: Estudante[];
  perguntas: Pergunta[];
  onReload: () => void | Promise<void>;
};

function statusClass(status: string) {
  if (status === 'validado') return 'bg-green-100 text-green-700';
  if (status === 'recusado') return 'bg-red-100 text-red-700';

  return 'bg-yellow-100 text-yellow-700';
}

export default function ApoioEstudanteModule({
  user,
  apoios,
  estudantes,
  perguntas,
  onReload,
}: Props) {
  const [form, setForm] = useState({
    estudante_id: '',
    turma: '',
    disciplina: '',
    feedback: '',
  });
  const [respostas, setRespostas] = useState<any>({});
  const { loading, loadingMessage, runWithLoading } = useLoadingAction();

  async function registrarApoio(e: FormEvent) {
    e.preventDefault();

    await runWithLoading('Salvando apoio...', async () => {
      const payload = {
        ...form,
        respostas: perguntas.map((pergunta) => ({
          pergunta_id: pergunta.id,
          resposta: respostas[pergunta.id] || '',
        })),
      };

      try {
        const response = await fetch('/api/apoios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          alert('Apoio registrado com sucesso!');
          setForm({ estudante_id: '', turma: '', disciplina: '', feedback: '' });
          setRespostas({});
          await onReload();
          return;
        }

        alert(data.error || 'Erro ao registrar apoio');
      } catch {
        alert('Erro ao registrar apoio');
      }
    });
  }

  async function validarApoio(apoioId: string, status: string) {
    await runWithLoading(
      status === 'validado' ? 'Validando apoio...' : 'Recusando apoio...',
      async () => {
        const observacao = prompt('Observacao do estudante (opcional):') || '';

        try {
          const response = await fetch('/api/validar-apoio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apoio_id: apoioId, status, observacao }),
          });

          const data = await response.json();

          if (data.success) {
            alert('Apoio atualizado!');
            await onReload();
            return;
          }

          alert(data.error || 'Erro ao validar apoio');
        } catch {
          alert('Erro ao validar apoio');
        }
      }
    );
  }

  return (
    <div className="grid gap-6">
      <LoadingOverlay show={loading} message={loadingMessage} />

      {user.perfil === 'professor' && (
        <section className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              Area do professor
            </p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Registrar apoio presencial
            </h2>
          </div>

          <form onSubmit={registrarApoio} className="grid gap-4">
            <select
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              value={form.estudante_id}
              onChange={(e) => {
                const estudante = estudantes.find((aluno) => aluno.id === e.target.value);
                setForm({
                  ...form,
                  estudante_id: e.target.value,
                  turma: estudante?.turma || '',
                });
              }}
              required
            >
              <option value="">Selecione o estudante</option>
              {estudantes.map((estudante) => (
                <option key={estudante.id} value={estudante.id}>
                  {estudante.nome} - {estudante.turma}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              placeholder="Turma"
              value={form.turma}
              readOnly
              required
            />

            <input
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              placeholder="Disciplina/Aula"
              value={form.disciplina}
              onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
              required
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <h3 className="mb-3 font-bold text-slate-950 dark:text-white">
                Perguntas pre-definidas
              </h3>

              {perguntas.map((pergunta) => (
                <div key={pergunta.id} className="mb-4">
                  <label className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
                    {pergunta.pergunta}
                  </label>

                  {pergunta.tipo === 'sim_nao' ? (
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      value={respostas[pergunta.id] || ''}
                      onChange={(e) =>
                        setRespostas({ ...respostas, [pergunta.id]: e.target.value })
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="Sim">Sim</option>
                      <option value="Nao">Nao</option>
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      value={respostas[pergunta.id] || ''}
                      onChange={(e) =>
                        setRespostas({ ...respostas, [pergunta.id]: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <textarea
              className="min-h-32 rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              placeholder="Feedback para o estudante"
              value={form.feedback}
              onChange={(e) => setForm({ ...form, feedback: e.target.value })}
              required
            />

            <button
              disabled={loading}
              className="rounded-xl bg-blue-700 p-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-white/10"
            >
              {loading ? 'Salvando...' : 'Salvar apoio'}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-950 dark:text-white">
          {isGestao(user.perfil) && 'Todos os apoios realizados'}
          {user.perfil === 'professor' && 'Meus apoios realizados'}
          {user.perfil === 'estudante' && 'Meus apoios recebidos'}
        </h2>

        <div className="grid gap-4">
          {apoios.map((apoio) => (
            <div
              key={apoio.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-400/60"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <h3 className="font-bold text-slate-950 dark:text-white">
                    {apoio.estudante_nome} - {apoio.turma}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    Professor: {apoio.professor_nome}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Aula: {apoio.disciplina} | Data: {apoio.data}
                  </p>
                </div>

                <span
                  className={`h-fit w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusClass(
                    apoio.status_validacao
                  )}`}
                >
                  {apoio.status_validacao}
                </span>
              </div>

              <p className="mt-3 text-slate-700 dark:text-slate-200">
                <strong>Feedback:</strong> {apoio.feedback}
              </p>

              {apoio.respostas && apoio.respostas.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/70">
                  <strong>Respostas:</strong>
                  {apoio.respostas.map((resposta, index) => (
                    <p key={index} className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {resposta.pergunta}: <b>{resposta.resposta}</b>
                    </p>
                  ))}
                </div>
              )}

              {apoio.observacao_estudante && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  <strong>Observacao do estudante:</strong> {apoio.observacao_estudante}
                </p>
              )}

              {user.perfil === 'estudante' && apoio.status_validacao === 'pendente' && (
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => validarApoio(apoio.id, 'validado')}
                    className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Validar apoio
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => validarApoio(apoio.id, 'recusado')}
                    className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Recusar
                  </button>
                </div>
              )}
            </div>
          ))}

          {apoios.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400">Nenhum apoio encontrado.</p>
          )}
        </div>
      </section>
    </div>
  );
}
