import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { validateEnv } from './config/env.js';
import { analyzeFood } from './services/gemini.js';
import { appendEntry, getEntries, clearSheet } from './services/sheets.js';

validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://adit-sinha.github.io'
  ]
}));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/analyze', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text input is required' });
    }

    const nutrition = await analyzeFood(text.trim());
    const entry = await appendEntry(text.trim(), nutrition);

    res.json({ nutrition, entry });
  } catch (error) {
    console.error('POST /analyze error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to analyze food' });
  }
});

app.get('/history', async (_req, res) => {
  try {
    const entries = await getEntries();
    res.json({ entries });
  } catch (error) {
    console.error('GET /history error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch history' });
  }
});

app.delete('/clear', async (_req, res) => {
  try {
    await clearSheet();
    res.json({ message: 'Sheet cleared successfully' });
  } catch (error) {
    console.error('DELETE /clear error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to clear sheet' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Calorie Tracker AI server running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process first:`);
    console.error(`  npx kill-port ${PORT}`);
    console.error('Or close the terminal where the server is already running.');
  } else {
    console.error('Server failed to start:', error.message);
  }
  process.exit(1);
});
