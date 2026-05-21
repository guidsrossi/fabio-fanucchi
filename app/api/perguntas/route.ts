import { NextResponse } from 'next/server';
import { appendRow, getRows, updateRow } from '@/lib/sheets';
import { getUserFromCookie } from '@/lib/auth';

const TIPOS_PERGUNTA = ['sim_nao', 'texto'];

function isGestao(perfil: string) {
  return perfil === 'gestao' || perfil === 'gestor';
}

function estaAtiva(valor: unknown) {
  return !['nao', 'false', '0'].includes(String(valor || '').trim().toLowerCase());
}

async function garantirCabecalhoPerguntas() {
  await updateRow('perguntas', 1, ['id', 'pergunta', 'tipo', 'ativa']);
}

export async function GET() {
  const user: any = await getUserFromCookie();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Nao autenticado' });
  }

  const perguntas = await getRows('perguntas');

  if (isGestao(user.perfil)) {
    return NextResponse.json({
      success: true,
      perguntas: perguntas.map((pergunta: any) => ({
        ...pergunta,
        ativa: estaAtiva(pergunta.ativa) ? 'sim' : 'nao',
      })),
    });
  }

  return NextResponse.json({
    success: true,
    perguntas: perguntas.filter((pergunta: any) => estaAtiva(pergunta.ativa)),
  });
}

export async function POST(req: Request) {
  const user: any = await getUserFromCookie();

  if (!user || !isGestao(user.perfil)) {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const body = await req.json();
  const pergunta = String(body.pergunta || '').trim();
  const tipo = String(body.tipo || '').trim();

  if (!pergunta) {
    return NextResponse.json({ success: false, error: 'Informe o texto da pergunta' });
  }

  if (!TIPOS_PERGUNTA.includes(tipo)) {
    return NextResponse.json({ success: false, error: 'Tipo de pergunta invalido' });
  }

  await garantirCabecalhoPerguntas();

  const perguntas = await getRows('perguntas');
  const ids = perguntas
    .map((item: any) => Number(item.id))
    .filter((id) => Number.isFinite(id));
  const perguntaId = String((ids.length ? Math.max(...ids) : 0) + 1);

  await appendRow('perguntas', [perguntaId, pergunta, tipo, 'sim']);

  return NextResponse.json({
    success: true,
    pergunta: {
      id: perguntaId,
      pergunta,
      tipo,
      ativa: 'sim',
    },
  });
}

export async function PUT(req: Request) {
  const user: any = await getUserFromCookie();

  if (!user || !isGestao(user.perfil)) {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const body = await req.json();
  const perguntaId = String(body.id || '').trim();
  const pergunta = String(body.pergunta || '').trim();
  const tipo = String(body.tipo || '').trim();
  const ativa = estaAtiva(body.ativa) ? 'sim' : 'nao';

  if (!perguntaId || !pergunta) {
    return NextResponse.json({ success: false, error: 'Informe a pergunta' });
  }

  if (!TIPOS_PERGUNTA.includes(tipo)) {
    return NextResponse.json({ success: false, error: 'Tipo de pergunta invalido' });
  }

  await garantirCabecalhoPerguntas();

  const perguntas = await getRows('perguntas');
  const index = perguntas.findIndex((item: any) => String(item.id || '').trim() === perguntaId);

  if (index === -1) {
    return NextResponse.json({ success: false, error: 'Pergunta nao encontrada' });
  }

  await updateRow('perguntas', index + 2, [perguntaId, pergunta, tipo, ativa]);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const user: any = await getUserFromCookie();

  if (!user || !isGestao(user.perfil)) {
    return NextResponse.json({ success: false, error: 'Acesso negado' });
  }

  const body = await req.json();
  const perguntaId = String(body.id || '').trim();

  if (!perguntaId) {
    return NextResponse.json({ success: false, error: 'Informe a pergunta' });
  }

  await garantirCabecalhoPerguntas();

  const perguntas = await getRows('perguntas');
  const index = perguntas.findIndex((item: any) => String(item.id || '').trim() === perguntaId);

  if (index === -1) {
    return NextResponse.json({ success: false, error: 'Pergunta nao encontrada' });
  }

  const pergunta = perguntas[index];

  await updateRow('perguntas', index + 2, [
    pergunta.id,
    pergunta.pergunta,
    pergunta.tipo,
    'nao',
  ]);

  return NextResponse.json({ success: true });
}
