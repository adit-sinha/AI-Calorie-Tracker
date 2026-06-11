import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are a nutrition estimation assistant. Estimate nutrition for the food described.

Return ONLY valid JSON with this format:
{
"calories": number,
"protein": number,
"carbs": number,
"fat": number
}

No explanation, no extra text.`;

function extractJson(text) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse nutrition data from Gemini response');
  }
}

function validateNutrition(data) {
  const fields = ['calories', 'protein', 'carbs', 'fat'];
  for (const field of fields) {
    const value = data[field];
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      throw new Error(`Invalid or missing field: ${field}`);
    }
  }
  return {
    calories: Math.round(data.calories),
    protein: Math.round(data.protein * 10) / 10,
    carbs: Math.round(data.carbs * 10) / 10,
    fat: Math.round(data.fat * 10) / 10,
  };
}

export async function analyzeFood(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${SYSTEM_PROMPT}\n\nFood: ${text}` }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const responseText = result.response.text();
  const parsed = extractJson(responseText);
  return validateNutrition(parsed);
}
