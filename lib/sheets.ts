import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export const sheets = google.sheets({ version: 'v4', auth });

export const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

function columnName(index: number) {
  let name = '';
  let current = index;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

export async function getRows(sheetName: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const values = response.data.values || [];
  const headers = values[0] || [];
  const rows = values.slice(1);

  return rows.map((row) => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

export async function appendRow(sheetName: string, values: any[]) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values],
    },
  });
}

export async function updateCell(sheetName: string, cell: string, value: string) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${cell}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[value]],
    },
  });
}

export async function updateRow(sheetName: string, rowNumber: number, values: any[]) {
  const lastColumn = columnName(values.length || 1);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}:${lastColumn}${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values],
    },
  });
}

export async function appendRows(sheetName: string, values: any[][]) {
  if (!values.length) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function batchUpdateRows(
  sheetName: string,
  rows: Array<{ rowNumber: number; values: any[] }>
) {
  if (!rows.length) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: rows.map(({ rowNumber, values }) => ({
        range: `${sheetName}!A${rowNumber}:${columnName(values.length || 1)}${rowNumber}`,
        values: [values],
      })),
    },
  });
}

export async function ensureSheet(sheetName: string) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetExists = spreadsheet.data.sheets?.some(
    (sheet) => sheet.properties?.title === sheetName
  );

  if (sheetExists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        },
      ],
    },
  });
}

export async function ensureSheetWithHeaders(sheetName: string, headers: string[]) {
  await ensureSheet(sheetName);
  await updateRow(sheetName, 1, headers);
}
