const API_BASE = 'https://ai-calorie-tracker-wush.onrender.com';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

export function analyzeFood(text) {
  return request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function fetchHistory() {
  return request('/history');
}

export function clearHistory() {
  return request('/clear', { method: 'DELETE' });
}
