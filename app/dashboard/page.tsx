'use client';

import { useEffect, useState } from 'react';

const ESCOLA = 'Escola Estadual Prof. Fabio Fanucchi';

function isGestao(perfil: string) {
  return perfil === 'gestao' || perfil === 'gestor';
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [apoios, setApoios] = useState<any[]>([]);
  const [estudantes, setEstudantes] = useState<any[]>([]);
  const [perguntas, setPerguntas] = useState<any[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);
  const [estudantesVinculo, setEstudantesVinculo] = useState<any[]>([]);
  const [vinculosPorProfessor, setVinculosPorProfessor] = useState<any>({});
  const [professorMensagem, setProfessorMensagem] = useState('');
  const [professorErro, setProfessorErro] = useState('');
  const [temaEscuro, setTemaEscuro] = useState(false);

  const [form, setForm] = useState({
    estudante_id: '',
    turma: '',
    disciplina: '',
    feedback: '',
  });

  const [professorForm, setProfessorForm] = useState({
    nome: '',
    email: '',
  });

  const [senhaForm, setSenhaForm] = useState({
    novaSenha: '',
    confirmarSenha: '',
  });

  const [respostas, setRespostas] = useState<any>({});

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

    setUser(me.user);

    if (me.user.precisa_trocar_senha) {
      setApoios([]);
      setEstudantes([]);
      setPerguntas([]);
      return;
    }

    const apoiosResp = await fetch('/api/apoios').then((r) => r.json());
    setApoios(apoiosResp.apoios || []);

    const perguntasResp = await fetch('/api/perguntas').then((r) => r.json());
    setPerguntas(perguntasResp.perguntas || []);

    if (isGestao(me.user.perfil)) {
      const professoresResp = await fetch('/api/professores').then((r) => r.json());
      setProfessores(professoresResp.professores || []);
      setEstudantesVinculo(professoresResp.estudantes || []);
      setVinculosPorProfessor(professoresResp.vinculosPorProfessor || {});
    }

    if (me.user.perfil === 'professor') {
      const estudantesResp = await fetch('/api/estudantes').then((r) => r.json());
      setEstudantes(estudantesResp.estudantes || []);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function sair() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  }

  async function alterarSenha(e: React.FormEvent) {
    e.preventDefault();

    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) {
      alert('As senhas digitadas nao conferem');
      return;
    }

    const response = await fetch('/api/alterar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novaSenha: senhaForm.novaSenha }),
    });

    const data = await response.json();

    if (data.success) {
      alert('Senha alterada com sucesso!');
      setSenhaForm({ novaSenha: '', confirmarSenha: '' });
      setUser(data.user);
      carregar();
    } else {
      alert(data.error || 'Erro ao alterar senha');
    }
  }

  async function cadastrarProfessor(e: React.FormEvent) {
    e.preventDefault();
    setProfessorMensagem('');
    setProfessorErro('');

    const response = await fetch('/api/professores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(professorForm),
    });

    const data = await response.json();

    if (data.success) {
      setProfessorMensagem(`Professor cadastrado. Senha inicial: ${data.senha_temporaria}`);
      setProfessorForm({ nome: '', email: '' });
      carregar();
    } else {
      setProfessorErro(data.error || 'Erro ao cadastrar professor');
    }
  }

  function alternarVinculoProfessor(professorId: string, estudanteId: string) {
    const estudantesAtuais = vinculosPorProfessor[professorId] || [];
    const jaSelecionado = estudantesAtuais.includes(estudanteId);

    setVinculosPorProfessor({
      ...vinculosPorProfessor,
      [professorId]: jaSelecionado
        ? estudantesAtuais.filter((item: string) => item !== estudanteId)
        : [...estudantesAtuais, estudanteId],
    });
  }

  async function salvarVinculosProfessor(professorId: string) {
    setProfessorMensagem('');
    setProfessorErro('');

    const response = await fetch('/api/professores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professor_id: professorId,
        estudantes: vinculosPorProfessor[professorId] || [],
      }),
    });

    const data = await response.json();

    if (data.success) {
      setProfessorMensagem('Vinculos do professor atualizados.');
      carregar();
    } else {
      setProfessorErro(data.error || 'Erro ao salvar vinculos');
    }
  }

  function estudantesDisponiveisParaProfessor(professorId: string) {
    return estudantesVinculo
      .filter((estudante: any) => !estudante.professor_id || estudante.professor_id === professorId)
      .sort((a: any, b: any) => {
        const turma = String(a.turma || '').localeCompare(String(b.turma || ''));

        if (turma !== 0) return turma;

        return String(a.nome || '').localeCompare(String(b.nome || ''));
      });
  }

  async function registrarApoio(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      ...form,
      respostas: perguntas.map((p: any) => ({
        pergunta_id: p.id,
        resposta: respostas[p.id] || '',
      })),
    };

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
      carregar();
    } else {
      alert(data.error || 'Erro ao registrar apoio');
    }
  }

  async function validarApoio(apoio_id: string, status: string) {
    const observacao = prompt('Observacao do estudante (opcional):') || '';

    const response = await fetch('/api/validar-apoio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apoio_id, status, observacao }),
    });

    const data = await response.json();

    if (data.success) {
      alert('Apoio atualizado!');
      carregar();
    } else {
      alert(data.error || 'Erro ao validar apoio');
    }
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
                  Sistema de Tutoria Presencial
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
                onClick={sair}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white shadow-lg shadow-red-600/15 transition hover:bg-red-700"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {user.precisa_trocar_senha && (
          <section className="mb-6 rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
            <h2 className="mb-2 text-xl font-bold text-slate-950 dark:text-white">Troque sua senha para continuar</h2>
            <p className="mb-4 text-slate-500 dark:text-slate-400">
              Sua conta comecou com senha temporaria. Cadastre uma nova senha no primeiro acesso.
            </p>

            <form onSubmit={alterarSenha} className="grid gap-4 max-w-md">
              <input
                className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                type="password"
                minLength={6}
                placeholder="Nova senha"
                value={senhaForm.novaSenha}
                onChange={(e) => setSenhaForm({ ...senhaForm, novaSenha: e.target.value })}
                required
              />

              <input
                className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                type="password"
                minLength={6}
                placeholder="Confirmar nova senha"
                value={senhaForm.confirmarSenha}
                onChange={(e) => setSenhaForm({ ...senhaForm, confirmarSenha: e.target.value })}
                required
              />

              <button className="rounded-xl bg-blue-700 p-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400">
                Salvar nova senha
              </button>
            </form>
          </section>
        )}

        {!user.precisa_trocar_senha && (
          <>
            {isGestao(user.perfil) && (
              <section className="mb-6 rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
                <div className="mb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                    Gestao escolar
                  </p>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Cadastrar professor</h2>
                </div>

                {professorMensagem && (
                  <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
                    {professorMensagem}
                  </div>
                )}

                {professorErro && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    {professorErro}
                  </div>
                )}

                <form onSubmit={cadastrarProfessor} className="grid gap-4 md:grid-cols-3">
                  <input
                    className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white md:col-span-1"
                    placeholder="Nome do professor"
                    value={professorForm.nome}
                    onChange={(e) => setProfessorForm({ ...professorForm, nome: e.target.value })}
                    required
                  />

                  <input
                    className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white md:col-span-1"
                    type="email"
                    placeholder="E-mail"
                    value={professorForm.email}
                    onChange={(e) => setProfessorForm({ ...professorForm, email: e.target.value })}
                    required
                  />

                  <button className="rounded-xl bg-blue-700 p-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400">
                    Cadastrar
                  </button>
                </form>

                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  O professor entra com a senha 123456 e troca a senha no primeiro acesso.
                </p>

                <div className="mt-8">
                  <h3 className="mb-3 text-lg font-bold text-slate-950 dark:text-white">Vincular professor com estudantes</h3>

                  {estudantesVinculo.length === 0 && (
                    <p className="text-slate-500 dark:text-slate-400">
                      Cadastre estudantes para liberar as opcoes de vinculo.
                    </p>
                  )}

                  <div className="grid gap-4">
                    {professores.map((professor: any) => (
                      <div key={professor.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                          <div>
                            <p className="font-semibold text-slate-950 dark:text-white">{professor.nome}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{professor.email}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => salvarVinculosProfessor(professor.id)}
                            className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                          >
                            Salvar vinculos
                          </button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                          {estudantesDisponiveisParaProfessor(professor.id).map((estudante: any) => (
                            <label
                              key={`${professor.id}-${estudante.id}`}
                              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:shadow-sm dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-blue-400"
                            >
                              <input
                                className="mt-1 h-4 w-4 accent-blue-700"
                                type="checkbox"
                                checked={(vinculosPorProfessor[professor.id] || []).includes(estudante.id)}
                                onChange={() => alternarVinculoProfessor(professor.id, estudante.id)}
                              />
                              <span>
                                <span className="block font-medium text-slate-950 dark:text-white">{estudante.nome}</span>
                                <span className="block text-sm text-slate-500 dark:text-slate-400">{estudante.turma}</span>
                              </span>
                            </label>
                          ))}

                          {estudantesDisponiveisParaProfessor(professor.id).length === 0 && (
                            <p className="text-slate-500 dark:text-slate-400">
                              Nao ha estudantes disponiveis para este professor.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {professores.length === 0 && (
                      <p className="text-slate-500 dark:text-slate-400">Nenhum professor cadastrado.</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {user.perfil === 'professor' && (
              <section className="mb-6 rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:p-6">
                <div className="mb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                    Area do professor
                  </p>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Registrar apoio presencial</h2>
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
                    {estudantes.map((estudante: any) => (
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
                    <h3 className="mb-3 font-bold text-slate-950 dark:text-white">Perguntas pre-definidas</h3>

                    {perguntas.map((pergunta: any) => (
                      <div key={pergunta.id} className="mb-4">
                        <label className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{pergunta.pergunta}</label>

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

                  <button className="rounded-xl bg-blue-700 p-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400">
                    Salvar apoio
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
                {apoios.map((apoio: any) => (
                  <div key={apoio.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-400/60">
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

                      <span className={`h-fit w-fit rounded-full px-3 py-1 text-sm font-semibold ${
                        apoio.status_validacao === 'validado'
                          ? 'bg-green-100 text-green-700'
                          : apoio.status_validacao === 'recusado'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apoio.status_validacao}
                      </span>
                    </div>

                    <p className="mt-3 text-slate-700 dark:text-slate-200">
                      <strong>Feedback:</strong> {apoio.feedback}
                    </p>

                    {apoio.respostas?.length > 0 && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/70">
                        <strong>Respostas:</strong>
                        {apoio.respostas.map((resposta: any, index: number) => (
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
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => validarApoio(apoio.id, 'validado')}
                          className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
                        >
                          Validar apoio
                        </button>

                        <button
                          onClick={() => validarApoio(apoio.id, 'recusado')}
                          className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
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
          </>
        )}
      </div>
    </main>
  );
}
