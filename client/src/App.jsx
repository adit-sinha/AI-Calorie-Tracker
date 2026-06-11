import { useState, useEffect, useCallback } from 'react';
import { analyzeFood, fetchHistory, clearHistory } from './api';
import './App.css';

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function isToday(iso) {
  try {
    const date = new Date(iso);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

function ResultsCard({ nutrition }) {
  return (
    <div className="results-card">
      <h2>Latest Analysis</h2>
      <div className="macro-grid">
        <div className="macro-item calories">
          <div className="value">{nutrition.calories}</div>
          <div className="label">Calories</div>
        </div>
        <div className="macro-item protein">
          <div className="value">{nutrition.protein}g</div>
          <div className="label">Protein</div>
        </div>
        <div className="macro-item carbs">
          <div className="value">{nutrition.carbs}g</div>
          <div className="label">Carbs</div>
        </div>
        <div className="macro-item fat">
          <div className="value">{nutrition.fat}g</div>
          <div className="label">Fat</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latest, setLatest] = useState(null);
  const [entries, setEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchHistory();
      setEntries(data.entries);
    } catch (err) {
      console.error('Failed to load history:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const dailyCalories = entries
    .filter((e) => isToday(e.timestamp))
    .reduce((sum, e) => sum + e.calories, 0);

  async function handleAnalyze() {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeFood(text.trim());
      setLatest(data.nutrition);
      setText('');
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!confirm('Clear all entries from the sheet? This cannot be undone.')) return;

    setLoading(true);
    setError(null);

    try {
      await clearHistory();
      setEntries([]);
      setLatest(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAnalyze();
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Calorie Tracker AI</h1>
        <p>Describe what you ate — AI estimates the nutrition and saves it for you.</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="input-section">
        <label htmlFor="food-input">What did you eat today?</label>
        <textarea
          id="food-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 2 eggs, toast with butter, black coffee, grilled chicken salad for lunch..."
          disabled={loading}
        />
        <div className="btn-row">
          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
          >
            {loading && <span className="loading-spinner" />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </section>

      {latest && <ResultsCard nutrition={latest} />}

      {!historyLoading && entries.length > 0 && (
        <div className="daily-total">
          <span className="label">Today&apos;s Total Calories</span>
          <span className="value">{dailyCalories.toLocaleString()} kcal</span>
        </div>
      )}

      <section className="history-section">
        <div className="history-header">
          <h2>History</h2>
          {entries.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={handleClear}
              disabled={loading}
            >
              Clear Sheet
            </button>
          )}
        </div>

        {historyLoading ? (
          <p className="history-empty">Loading history...</p>
        ) : entries.length === 0 ? (
          <p className="history-empty">No entries yet. Analyze your first meal above!</p>
        ) : (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Food</th>
                  <th>Cal</th>
                  <th>Protein</th>
                  <th>Carbs</th>
                  <th>Fat</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={`${entry.timestamp}-${i}`}>
                    <td>{formatTime(entry.timestamp)}</td>
                    <td className="food-cell" title={entry.food}>{entry.food}</td>
                    <td>{entry.calories}</td>
                    <td>{entry.protein}g</td>
                    <td>{entry.carbs}g</td>
                    <td>{entry.fat}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
