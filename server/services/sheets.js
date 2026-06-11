import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const SHEET_NAME = 'Sheet1';
const HEADERS = ['Timestamp', 'Food', 'Calories', 'Protein', 'Carbs', 'Fat'];

function loadServiceAccountCredentials() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE?.trim();
  if (keyFile) {
    const resolved = path.resolve(keyFile);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Service account key file not found: ${resolved}`);
    }
    const json = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    return {
      clientEmail: json.client_email,
      privateKey: json.private_key,
    };
  }

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Google Sheets credentials missing. Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE or GOOGLE_SHEETS_CLIENT_EMAIL + GOOGLE_SHEETS_PRIVATE_KEY in server/.env',
    );
  }

  return { clientEmail, privateKey };
}

function getAuthClient() {
  const spreadsheetId = process.env.SPREADSHEET_ID?.trim();
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID is missing in server/.env');
  }

  const { clientEmail, privateKey } = loadServiceAccountCredentials();

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { auth, spreadsheetId };
}

function getSheetsClient() {
  const { auth, spreadsheetId } = getAuthClient();
  return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId };
}

export async function ensureHeaders() {
  const { sheets, spreadsheetId } = getSheetsClient();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:F1`,
  });

  if (!existing.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:F1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

export async function appendEntry(text, nutrition) {
  await ensureHeaders();
  const { sheets, spreadsheetId } = getSheetsClient();

  const timestamp = new Date().toISOString();
  const row = [
    timestamp,
    text,
    nutrition.calories,
    nutrition.protein,
    nutrition.carbs,
    nutrition.fat,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:F`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return { timestamp, text, ...nutrition };
}

export async function getEntries() {
  await ensureHeaders();
  const { sheets, spreadsheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:F`,
  });

  const rows = response.data.values || [];
  return rows.map((row) => ({
    timestamp: row[0] || '',
    food: row[1] || '',
    calories: Number(row[2]) || 0,
    protein: Number(row[3]) || 0,
    carbs: Number(row[4]) || 0,
    fat: Number(row[5]) || 0,
  })).reverse();
}

export async function clearSheet() {
  const { sheets, spreadsheetId } = getSheetsClient();

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:F`,
  });

  await ensureHeaders();
}
