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
const response = await api.spreadsheets.values.get({ spreadsheetId: esperado, range: 'notas_bimestrais!A:J' });
const rows = response.data.values || [];
const headers = ['id', 'ano', 'bimestre', 'nome', 'turma', 'situacao', 'frequencia', 'disciplina', 'nota', 'fonte'];
if (headers.some((h, i) => rows[0]?.[i] !== h)) throw new Error('Cabeçalhos inesperados');
const key = (nome, disciplina) => `${nome}|${disciplina}`;
const existing = new Map();
rows.slice(1).forEach((row, i) => {
  if (Number(row[1]) !== 2026 || Number(row[2]) !== 3 || row[4] !== '1A') return;
  const k = key(row[3], row[7]);
  if (existing.has(k)) throw new Error('Notas duplicadas no banco; importação cancelada');
  existing.set(k, { rowNumber: i + 2, values: row });
});
let nextId = Math.max(0, ...rows.slice(1).map(r => Number(r[0]) || 0)) + 1;
const updates = [], additions = [], backup = [];
for (const student of source) for (const nota of student.notas) {
  const old = existing.get(key(student.nome, nota.disciplina));
  const values = [old?.values[0] || nextId++, 2026, 3, student.nome, '1A', student.situacao,
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
  const target = (verify.data.values || []).slice(1).filter(r => Number(r[1]) === 2026 && Number(r[2]) === 3 && r[4] === '1A');
  for (const student of source) for (const nota of student.notas) {
    const matches = target.filter(r => r[3] === student.nome && r[7] === nota.disciplina);
    if (matches.length !== 1 || Number(matches[0][8]) !== nota.nota || matches[0][6] !== student.frequencia) throw new Error('Falha na conferência da importação');
  }
  console.log('Importação conferida na planilha.');
}
