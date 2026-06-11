import fs from 'fs';
import path from 'path';

function missingVars(vars) {
  return vars.filter((name) => !process.env[name]?.trim());
}

export function validateEnv() {
  const missingGemini = missingVars(['GEMINI_API_KEY']);
  if (missingGemini.length) {
    console.warn(`Warning: missing ${missingGemini.join(', ')} — /analyze will fail`);
  } else if (!process.env.GEMINI_API_KEY.startsWith('AIza')) {
    console.warn(
      'Warning: GEMINI_API_KEY should start with "AIza". Get one at https://aistudio.google.com/apikey',
    );
  }

  const hasKeyFile = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE?.trim());
  const sheetVars = hasKeyFile
    ? ['SPREADSHEET_ID']
    : ['GOOGLE_SHEETS_CLIENT_EMAIL', 'GOOGLE_SHEETS_PRIVATE_KEY', 'SPREADSHEET_ID'];

  const missingSheets = missingVars(sheetVars);
  if (missingSheets.length) {
    console.warn(`Warning: missing ${missingSheets.join(', ')} — sheet endpoints will fail`);
    return;
  }

  if (!hasKeyFile) {
    const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (!email.includes('.iam.gserviceaccount.com')) {
      console.warn(
        'Warning: GOOGLE_SHEETS_CLIENT_EMAIL should be a service account email ending in .iam.gserviceaccount.com',
      );
    }

    if (!key.includes('BEGIN PRIVATE KEY')) {
      console.warn(
        'Warning: GOOGLE_SHEETS_PRIVATE_KEY should be the PEM private key from your service account JSON (include -----BEGIN PRIVATE KEY-----)',
      );
    }
  } else {
    const keyFile = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    if (!fs.existsSync(keyFile)) {
      console.warn(`Warning: GOOGLE_SERVICE_ACCOUNT_KEY_FILE not found at ${keyFile}`);
    }
  }
}
