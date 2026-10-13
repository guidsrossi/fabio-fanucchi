import fs from 'node:fs/promises';
import { google } from 'googleapis';

const aplicar = process.argv.includes('--aplicar');
const esperado = '1Uyg-Wypf1UV4tk2eHYlcdnq3fdH1jkhsW_GSYsZbyC8';
if (process.env.GOOGLE_SHEET_ID !== esperado) throw new Error('Banco de destino diferente do autorizado');
const auth = new google.auth.JWT({ email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const api = google.sheets({ version: 'v4', auth });
const source = JSON.parse(await fs.readFile(new URL('../data/notas-terceiro-bimestre.json', import.meta.url), 'utf8'));
const turmas = new Set(source.map(student => student.turma));
const response = await api.spreadsheets.values.get({ spreadsheetId: esperado, range: 'notas_bimestrais!A:J' });
const rows = response.data.values || [];
const headers = ['id', 'ano', 'bimestre', 'nome', 'turma', 'situacao', 'frequencia', 'disciplina', 'nota', 'fonte'];
if (headers.some((h, i) => rows[0]?.[i] !== h)) throw new Error('Cabeçalhos inesperados');
const key = (turma, nome, disciplina) => JSON.stringify([turma, nome, disciplina]);
const existing = new Map();
rows.slice(1).forEach((row, i) => {
  if (Number(row[1]) !== 2026 || Number(row[2]) !== 3 || !turmas.has(row[4])) return;
  const k = key(row[4], row[3], row[7]);
  if (existing.has(k)) throw new Error('Notas duplicadas no banco; importação cancelada');
  existing.set(k, { rowNumber: i + 2, values: row });
});
let nextId = Math.max(0, ...rows.slice(1).map(r => Number(r[0]) || 0)) + 1;
const updates = [], additions = [], backup = [];
for (const student of source) for (const nota of student.notas) {
  const old = existing.get(key(student.turma, student.nome, nota.disciplina));
  const values = [old?.values[0] || nextId++, 2026, 3, student.nome, student.turma, student.situacao,
    student.frequencia, nota.disciplina, nota.nota, student.fonte];
  if (old) {
    if (values.every((v, i) => String(v) === String(old.values[i] ?? ''))) continue;
    updates.push({ range: `notas_bimestrais!A${old.rowNumber}:J${old.rowNumber}`, values: [values] });
    backup.push(old);
  } else additions.push(values);
}
console.log(JSON.stringify({ aplicar, estudantes: source.length, atualizar: updates.length, incluir: additions.length }));
if (aplicar) {
  await fs.mkdir('private/importacoes', { recursive: true });
  await fs.writeFile(`private/importacoes/terceiro-bimestre-${Date.now()}.json`, JSON.stringify({ backup, additions }));
  if (updates.length) await api.spreadsheets.values.batchUpdate({ spreadsheetId: esperado,
    requestBody: { valueInputOption: 'RAW', data: updates } });
  if (additions.length) await api.spreadsheets.values.append({ spreadsheetId: esperado,
    range: 'notas_bimestrais!A:J', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: additions } });
  const verify = await api.spreadsheets.values.get({ spreadsheetId: esperado, range: 'notas_bimestrais!A:J' });
  const target = (verify.data.values || []).slice(1).filter(r => Number(r[1]) === 2026 && Number(r[2]) === 3 && turmas.has(r[4]));
  for (const student of source) for (const nota of student.notas) {
    const matches = target.filter(r => r[4] === student.turma && r[3] === student.nome && r[7] === nota.disciplina);
    if (matches.length !== 1 || Number(matches[0][8]) !== nota.nota || matches[0][6] !== student.frequencia) throw new Error('Falha na conferência da importação');
  }
  console.log('Importação conferida na planilha.');
  // Mantém o mapão completo no banco, incluindo menções e frequência anual.
  // Os dados locais de extração não devem ser publicados no repositório.
  const mapaoHeaders = ['ano', 'bimestre', 'nome', 'turma', 'serie', 'situacao', 'frequencia', 'frequencia_anual', 'notas_json', 'mencoes_json', 'fonte'];
  const metadata = await api.spreadsheets.get({ spreadsheetId: esperado, fields: 'sheets.properties.title' });
  if (!metadata.data.sheets.some(s => s.properties.title === 'notas_mapao')) {
    await api.spreadsheets.batchUpdate({ spreadsheetId: esperado, requestBody: { requests: [{ addSheet: { properties: { title: 'notas_mapao' } } }] } });
    await api.spreadsheets.values.update({ spreadsheetId: esperado, range: 'notas_mapao!A1:K1', valueInputOption: 'RAW', requestBody: { values: [mapaoHeaders] } });
  }
  const previous = (await api.spreadsheets.values.get({ spreadsheetId: esperado, range: 'notas_mapao!A:K' })).data.values || [];
  if (mapaoHeaders.some((h, i) => previous[0]?.[i] !== h)) throw new Error('Cabeçalhos inesperados em notas_mapao');
  const mapaoUpdates = [], mapaoAdditions = [];
  for (const student of source) {
    const matches = previous.map((r, i) => ({ r, i })).filter(({ r }) => Number(r[0]) === 2026 && Number(r[1]) === 3 && r[2] === student.nome && r[3] === student.turma);
    if (matches.length > 1) throw new Error('Estudante duplicado em notas_mapao');
    const values = [2026, 3, student.nome, student.turma, student.serie, student.situacao, student.frequencia, student.frequencia_anual, JSON.stringify(student.notas), JSON.stringify(student.mencoes), student.fonte];
    if (!matches.length) mapaoAdditions.push(values);
    else if (!values.every((v, i) => String(v) === String(matches[0].r[i] ?? ''))) mapaoUpdates.push({ range: `notas_mapao!A${matches[0].i + 1}:K${matches[0].i + 1}`, values: [values] });
  }
  if (mapaoUpdates.length) {
    await fs.writeFile(`private/importacoes/mapao-${Date.now()}.json`, JSON.stringify(previous));
    await api.spreadsheets.values.batchUpdate({ spreadsheetId: esperado, requestBody: { valueInputOption: 'RAW', data: mapaoUpdates } });
  }
  if (mapaoAdditions.length) await api.spreadsheets.values.append({ spreadsheetId: esperado, range: 'notas_mapao!A:K', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: mapaoAdditions } });
  const saved = (await api.spreadsheets.values.get({ spreadsheetId: esperado, range: 'notas_mapao!A:K' })).data.values.slice(1);
  for (const student of source) {
    const matches = saved.filter(r => Number(r[0]) === 2026 && Number(r[1]) === 3 && r[2] === student.nome && r[3] === student.turma);
    if (matches.length !== 1 || matches[0][8] !== JSON.stringify(student.notas) || matches[0][9] !== JSON.stringify(student.mencoes) || matches[0][7] !== student.frequencia_anual) throw new Error('Falha na conferência do mapão');
  }
  console.log(JSON.stringify({ mapoesConferidos: source.length, incluidos: mapaoAdditions.length, atualizados: mapaoUpdates.length }));
}
