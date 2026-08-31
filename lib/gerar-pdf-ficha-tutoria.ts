import { disciplinasDaTurma } from '@/lib/disciplinas-tutoria';

type Bimestre = { meta?: string; nota?: string; frequencia?: string };
type Linha = { disciplina?: string; bimestres?: Bimestre[] };
type Ficha = { ra?: string; dataNascimento?: string; projetoVida?: string; hobby?: string; clube1?: string; clube2?: string; liderTurma?: boolean; liderClube?: boolean; gremista?: boolean; responsaveis?: string; gerais?: Linha[]; tecnicas?: Linha[]; plataformas?: Linha[]; anotacoesFinais?: string };
type Registro = { data: string; professor_nome?: string; relato?: string };
type Estudante = { nome: string; turma: string };

const texto = (valor: unknown) => String(valor || '').trim() || '-';

export async function gerarPdfFichaCompleta(estudante: Estudante, ficha: Ficha, registros: Registro[]) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margem = 10; const largura = 277;
  function titulo(pagina: string) {
    pdf.setFillColor(30, 64, 175); pdf.rect(margem, 8, largura, 13, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13);
    pdf.text('PROGRAMA ENSINO INTEGRAL - FICHA DE TUTORIA', 148.5, 16, { align: 'center' });
    pdf.setFontSize(8); pdf.text(pagina, 285, 16, { align: 'right' }); pdf.setTextColor(15, 23, 42);
  }
  function campo(rotulo: string, valor: unknown, x: number, y: number, w: number) {
    pdf.setDrawColor(100, 116, 139); pdf.rect(x, y, w, 12); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.text(rotulo, x + 2, y + 4);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text(pdf.splitTextToSize(texto(valor), w - 4).slice(0, 2), x + 2, y + 8);
  }
  function tabela(tituloTabela: string, linhas: Linha[], yInicial: number) {
    const x = margem; const nomeW = 65; const celW = (largura - nomeW) / 12; const altura = 8;
    pdf.setFillColor(219, 234, 254); pdf.rect(x, yInicial, largura, altura, 'F'); pdf.setDrawColor(100, 116, 139); pdf.rect(x, yInicial, largura, altura);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.text(tituloTabela, x + 2, yInicial + 5);
    for (let b = 0; b < 4; b++) pdf.text(`${b + 1}º BIMESTRE`, x + nomeW + celW * (b * 3 + 1.5), yInicial + 5, { align: 'center' });
    let y = yInicial + altura; pdf.setFillColor(241, 245, 249); pdf.rect(x, y, largura, 6, 'F');
    ['DISCIPLINA', ...Array.from({ length: 4 }, () => ['Meta', 'Nota', 'Freq.']).flat()].forEach((cab, i) => { const cx = i === 0 ? x : x + nomeW + celW * (i - 1); const cw = i === 0 ? nomeW : celW; pdf.rect(cx, y, cw, 6); pdf.setFontSize(6); pdf.text(cab, cx + cw / 2, y + 4, { align: 'center' }); });
    y += 6;
    linhas.forEach((linha) => {
      pdf.rect(x, y, nomeW, altura); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.text(texto(linha.disciplina), x + 2, y + 5);
      Array.from({ length: 4 }, (_, b) => { const item = linha.bimestres?.[b] || {}; return [item.meta, item.nota, item.frequencia]; }).flat().forEach((valor, i) => { const cx = x + nomeW + celW * i; pdf.rect(cx, y, celW, altura); pdf.text(texto(valor), cx + celW / 2, y + 5, { align: 'center' }); });
      y += altura;
    }); return y;
  }

  titulo('FRENTE');
  campo('ESTUDANTE', estudante.nome, margem, 25, 130); campo('SÉRIE / TURMA', estudante.turma, 140, 25, 55); campo('RA', ficha.ra, 195, 25, 45); campo('NASCIMENTO', ficha.dataNascimento, 240, 25, 47);
  campo('PROJETO DE VIDA', ficha.projetoVida, margem, 39, 105); campo('HOBBY', ficha.hobby, 115, 39, 75); campo('RESPONSÁVEIS', ficha.responsaveis, 190, 39, 97);
  campo('CLUBE JUVENIL - 1º SEMESTRE', ficha.clube1, margem, 53, 100); campo('CLUBE JUVENIL - 2º SEMESTRE', ficha.clube2, 110, 53, 100);
  campo('PARTICIPAÇÃO ESCOLAR', [ficha.liderTurma && 'Líder da turma', ficha.liderClube && 'Líder de clube', ficha.gremista && 'Gremista'].filter(Boolean).join(', '), 210, 53, 77);
  tabela('COMPONENTES CURRICULARES - FORMAÇÃO GERAL BÁSICA', ficha.gerais || [], 69);

  pdf.addPage('a4', 'landscape'); titulo('VERSO');
  const modalidade = disciplinasDaTurma(estudante.turma).modalidade;
  const tituloItinerario = modalidade === 'tecnico' ? 'FORMAÇÃO TÉCNICA' : `ITINERÁRIO FORMATIVO - ${modalidade === 'humanas' ? 'HUMANAS' : 'EXATAS'}`;
  let y = tabela(tituloItinerario, ficha.tecnicas || [], 27) + 7;
  y = tabela('PLATAFORMAS E ATIVIDADES', ficha.plataformas || [], y) + 7; campo('ANOTAÇÕES FINAIS', ficha.anotacoesFinais, margem, y, largura);

  pdf.addPage('a4', 'landscape'); titulo('REGISTROS DE TUTORIA');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text(`${estudante.nome} - ${estudante.turma}`, margem, 28); pdf.setFontSize(8); pdf.text(`Total de registros: ${registros.length}`, margem, 34); y = 40;
  if (!registros.length) { pdf.setFont('helvetica', 'normal'); pdf.text('Nenhum registro de tutoria encontrado.', margem, y); }
  registros.forEach((registro, indice) => {
    const relato = pdf.splitTextToSize(texto(registro.relato), largura - 8); const altura = Math.max(18, relato.length * 4 + 12);
    if (y + altura > 198) { pdf.addPage('a4', 'landscape'); titulo('REGISTROS DE TUTORIA'); y = 28; }
    pdf.setDrawColor(148, 163, 184); pdf.rect(margem, y, largura, altura); pdf.setFillColor(241, 245, 249); pdf.rect(margem, y, largura, 8, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); const data = /^\d{4}-\d{2}-\d{2}$/.test(registro.data) ? registro.data.split('-').reverse().join('/') : registro.data;
    pdf.text(`${indice + 1}. ${data} - ${texto(registro.professor_nome)}`, margem + 3, y + 5); pdf.setFont('helvetica', 'normal'); pdf.text(relato, margem + 4, y + 13); y += altura + 4;
  });
  const nome = estudante.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  pdf.save(`ficha-completa-tutoria-${nome}.pdf`);
}
