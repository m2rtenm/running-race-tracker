import { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import PerformanceChart from '../components/PerformanceChart';
import StravaConnect from '../components/StravaConnect';
import { createRace, deleteRaceById, listRaces, updateRace } from '../api';
import '../App.css';

const StatsOverview = lazy(() => import('../components/StatsOverview'));

const emptyForm = {
  competitionName: '',
  date: '',
  officialDistance: '',
  officialResult: '',
  actualDistance: '',
};

function parseResultToSeconds(value) {
  const parts = value.split(':').map((part) => Number(part.trim()));
  if (parts.some((part) => Number.isNaN(part))) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (minutes < 0 || seconds < 0) return null;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (hours < 0 || minutes < 0 || seconds < 0) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours > 0) parts.push(String(hours).padStart(2, '0'));
  parts.push(String(minutes).padStart(2, '0'));
  parts.push(String(seconds).padStart(2, '0'));
  return parts.join(':');
}

function formatDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function normalizeRace(race) {
  return {
    ...race,
    id: race.id || race.raceId,
  };
}

function Dashboard({ onLogout }) {
  const { user } = useAuth();
  const [races, setRaces] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef(null);

  // Inline editing state (in the race records table)
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditForm, setInlineEditForm] = useState({});

  const loadRaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const remoteRaces = await listRaces();
      const normalized = Array.isArray(remoteRaces) ? remoteRaces.map(normalizeRace) : [];
      setRaces(normalized);
      setStatus('Loaded races from the cloud backend.');
    } catch (error) {
      console.error('Error loading races:', error);
      setStatus('Error loading races. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRaces();
  }, [loadRaces]);

  const sortedRaces = useMemo(() => [...races].sort((a, b) => b.date.localeCompare(a.date)), [races]);

  const summary = useMemo(() => {
    const totalRaces = sortedRaces.length;
    const totalDistance = sortedRaces.reduce((sum, race) => sum + Number(race.actualDistance), 0);
    const averageTime = totalRaces
      ? Math.round(sortedRaces.reduce((sum, race) => sum + race.officialResultSeconds, 0) / totalRaces)
      : 0;
    const bestTime = totalRaces
      ? sortedRaces.reduce((best, race) => Math.min(best, race.officialResultSeconds), Number.POSITIVE_INFINITY)
      : null;

    return {
      totalRaces,
      totalDistance,
      averageTime,
      bestTime,
    };
  }, [sortedRaces]);

  const distanceStats = useMemo(() => {
    const grouped = new Map();
    for (const race of sortedRaces) {
      const key = `${Number(race.officialDistance).toFixed(1)} km`;
      if (!grouped.has(key)) {
        grouped.set(key, { count: 0, totalTime: 0, bestTime: Infinity });
      }
      const bucket = grouped.get(key);
      bucket.count += 1;
      bucket.totalTime += race.officialResultSeconds;
      bucket.bestTime = Math.min(bucket.bestTime, race.officialResultSeconds);
    }

    return [...grouped.entries()].map(([label, values]) => ({
      label,
      count: values.count,
      average: values.count ? Math.round(values.totalTime / values.count) : 0,
      best: values.bestTime === Infinity ? null : values.bestTime,
    })).sort((a, b) => Number(a.label.split(' ')[0]) - Number(b.label.split(' ')[0]));
  }, [sortedRaces]);

  const yearStats = useMemo(() => {
    const grouped = new Map();
    for (const race of sortedRaces) {
      const year = new Date(race.date).getFullYear();
      const key = String(year);
      if (!grouped.has(key)) {
        grouped.set(key, { count: 0, totalTime: 0, bestTime: Infinity });
      }
      const bucket = grouped.get(key);
      bucket.count += 1;
      bucket.totalTime += race.officialResultSeconds;
      bucket.bestTime = Math.min(bucket.bestTime, race.officialResultSeconds);
    }

    return [...grouped.entries()].map(([label, values]) => ({
      label,
      count: values.count,
      average: values.count ? Math.round(values.totalTime / values.count) : 0,
      best: values.bestTime === Infinity ? null : values.bestTime,
    })).sort((a, b) => Number(b.label) - Number(a.label));
  }, [sortedRaces]);

  const competitionStats = useMemo(() => {
    const grouped = new Map();
    for (const race of sortedRaces) {
      const key = race.competitionName.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, { competitionName: race.competitionName, count: 0, totalTime: 0, bestTime: Infinity, bestYear: null, distances: [] });
      }
      const bucket = grouped.get(key);
      bucket.count += 1;
      bucket.totalTime += race.officialResultSeconds;
      bucket.distances.push(Number(race.officialDistance));
      if (race.officialResultSeconds < bucket.bestTime) {
        bucket.bestTime = race.officialResultSeconds;
        bucket.bestYear = new Date(race.date).getFullYear();
      }
    }

    return [...grouped.values()].map((values) => {
      // Pick most common official distance for this competition
      const distFreq = {};
      values.distances.forEach((d) => { distFreq[d] = (distFreq[d] || 0) + 1; });
      const officialDistance = Number(Object.entries(distFreq).sort((a, b) => b[1] - a[1])[0][0]);
      return {
        competitionName: values.competitionName,
        count: values.count,
        officialDistance,
        average: values.count ? Math.round(values.totalTime / values.count) : 0,
        best: values.bestTime === Infinity ? null : values.bestTime,
        bestYear: values.bestYear,
      };
    }).sort((a, b) => a.competitionName.localeCompare(b.competitionName));
  }, [sortedRaces]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleInlineChange(event) {
    const { name, value } = event.target;
    setInlineEditForm((prev) => ({ ...prev, [name]: value }));
  }

  function startInlineEdit(race) {
    setInlineEditId(race.id);
    setInlineEditForm({
      competitionName: race.competitionName || '',
      date: race.date || '',
      officialDistance: String(race.officialDistance ?? ''),
      officialResult: race.officialResult || '',
      actualDistance: String(race.actualDistance ?? ''),
    });
  }

  function cancelInlineEdit() {
    setInlineEditId(null);
    setInlineEditForm({});
  }

  async function saveInlineEdit() {
    const id = inlineEditId;
    const officialResultSeconds = parseResultToSeconds(inlineEditForm.officialResult);

    if (!inlineEditForm.competitionName || !inlineEditForm.date || !inlineEditForm.officialDistance || !inlineEditForm.actualDistance || officialResultSeconds === null) {
      setStatus('Please fill all required fields with valid values.');
      return;
    }

    const updates = {
      competitionName: inlineEditForm.competitionName.trim(),
      date: inlineEditForm.date,
      officialDistance: Number(inlineEditForm.officialDistance),
      officialResult: inlineEditForm.officialResult.trim(),
      officialResultSeconds,
      actualDistance: Number(inlineEditForm.actualDistance),
    };

    setRaces((current) => current.map((r) => r.id === id ? { ...r, ...updates } : r));
    setInlineEditId(null);
    setInlineEditForm({});

    try {
      const updated = await updateRace(id, updates);
      setRaces((current) => current.map((r) => r.id === id ? normalizeRace(updated) : r));
      setStatus(`Updated ${updates.competitionName}.`);
    } catch (error) {
      console.error(error);
      setStatus('Updated locally, but cloud sync failed.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const officialResultSeconds = parseResultToSeconds(form.officialResult);

    if (!form.competitionName || !form.date || !form.officialDistance || !form.actualDistance || officialResultSeconds === null) {
      setStatus('Please enter a valid competition, date, distance and result.');
      return;
    }

    const race = {
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      competitionName: form.competitionName.trim(),
      date: form.date,
      officialDistance: Number(form.officialDistance),
      officialResult: form.officialResult.trim(),
      officialResultSeconds,
      actualDistance: Number(form.actualDistance),
    };

    setRaces((current) => [race, ...current]);
    setForm(emptyForm);

    try {
      const saved = await createRace(race);
      setRaces((current) => [normalizeRace(saved), ...current.filter((item) => item.id !== race.id)]);
      setStatus(`Saved ${race.competitionName} on ${formatDate(race.date)}.`);
    } catch (error) {
      console.error(error);
      setStatus('Saved locally, but the cloud backend was not available.');
    }
  }

  function handleDelete(id) {
    const nextRaces = races.filter((race) => race.id !== id);
    setRaces(nextRaces);
    if (editingRaceId === id) {
      cancelEdit();
    }

    deleteRaceById(id)
      .catch((error) => {
        console.error(error);
        setStatus('Removed locally, but cloud deletion failed.');
      });

    setStatus('Race removed.');
  }

  function handleClear() {
    setRaces([]);
    setStatus('All races cleared.');
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Personal performance tracker</p>
          <h1>Running Race Tracker</h1>
          <p className="subtitle">Record race results, compare your performances by distance and year, and keep a personal history of your running journey.</p>
        </div>
        <div className="user-menu">
          <div className="user-info">
            <p className="user-name">{user?.email || user?.username}</p>
          </div>
          <button onClick={onLogout} className="logout-button">Sign Out</button>
        </div>
      </header>

      <section className="panel">
        <h2 style={{ marginBottom: '12px' }}>Import from Strava</h2>
        <StravaConnect onSyncComplete={loadRaces} />
      </section>

      <section className="panel panel-grid">
        <div className="panel-heading">
          <h2>Add a race result</h2>
          <p>Capture each run so your dashboard can tell the story of your progress.</p>
        </div>
        <form ref={formRef} className="race-form" onSubmit={handleSubmit}>
          <label>
            Competition name
            <input name="competitionName" value={form.competitionName} onChange={handleChange} required />
          </label>
          <label>
            Date
            <input name="date" type="date" value={form.date} onChange={handleChange} required />
          </label>
          <label>
            Official distance (km)
            <input name="officialDistance" type="number" step="0.01" min="0.01" value={form.officialDistance} onChange={handleChange} required />
          </label>
          <label>
            Official result
            <input name="officialResult" placeholder="HH:MM:SS" value={form.officialResult} onChange={handleChange} required />
          </label>
          <label>
            Actual distance (km)
            <input name="actualDistance" type="number" step="0.01" min="0.01" value={form.actualDistance} onChange={handleChange} required />
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="submit">Save race</button>
          </div>
        </form>
        {status ? <p className="status">{status}</p> : null}
        {isLoading ? <p className="status">Syncing with the backend…</p> : null}
      </section>

      <section className="panel">
        <div className="stats-grid">
          <StatCard label="Total races" value={summary.totalRaces} kind="races" />
          <StatCard label="Total distance" value={`${summary.totalDistance.toFixed(1)} km`} kind="distance" />
          <StatCard label="Best result" value={summary.bestTime ? formatSeconds(summary.bestTime) : '—'} kind="best" />
          <StatCard label="Years tracked" value={new Set(sortedRaces.map((race) => new Date(race.date).getFullYear())).size} kind="years" />
        </div>

        <div className="chart-section">
          <PerformanceChart races={sortedRaces} />
        </div>

        <div className="stats-grid stats-grid-compact">
          <div className="table-card">
            <h3>By distance</h3>
            <table>
              <thead>
                <tr>
                  <th>Distance</th>
                  <th>Races</th>
                  <th>Best</th>
                </tr>
              </thead>
              <tbody>
                {distanceStats.map((item) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
                    <td>{item.count}</td>
                    <td>{item.best ? formatSeconds(item.best) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-card">
            <h3>By year</h3>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Races</th>
                  <th>Best</th>
                </tr>
              </thead>
              <tbody>
                {yearStats.map((item) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
                    <td>{item.count}</td>
                    <td>{item.best ? formatSeconds(item.best) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-card full-width">
          <h3>Competition comparison</h3>
          <table>
            <thead>
              <tr>
                <th>Competition</th>
                <th>Distance</th>
                <th>Races</th>
                <th>Best</th>
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              {competitionStats.map((item) => (
                <tr key={item.competitionName}>
                  <td>{item.competitionName}</td>
                  <td>{item.officialDistance} km</td>
                  <td>{item.count}</td>
                  <td>{item.best ? `${formatSeconds(item.best)} (${item.bestYear})` : '—'}</td>
                  <td>{item.average ? formatSeconds(item.average) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="records-header">
          <h2>Race records</h2>
          <button type="button" className="secondary" onClick={handleClear}>Clear all</button>
        </div>
        {sortedRaces.length === 0 ? (
          <p className="empty">No races added yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="race-records-table">
              <thead>
                <tr>
                  <th>Competition</th>
                  <th>Date</th>
                  <th>Official dist.</th>
                  <th>Actual dist.</th>
                  <th>Official result</th>
                  <th style={{ width: '120px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedRaces.map((race) => {
                  const isEditing = inlineEditId === race.id;
                  return (
                    <tr key={race.id} className={isEditing ? 'editing-row' : ''}>
                      <td>
                        {isEditing
                          ? <input className="inline-input" name="competitionName" value={inlineEditForm.competitionName} onChange={handleInlineChange} />
                          : race.competitionName}
                      </td>
                      <td>
                        {isEditing
                          ? <input className="inline-input" name="date" type="date" value={inlineEditForm.date} onChange={handleInlineChange} />
                          : formatDate(race.date)}
                      </td>
                      <td>
                        {isEditing
                          ? <input className="inline-input" name="officialDistance" type="number" step="0.01" min="0.01" value={inlineEditForm.officialDistance} onChange={handleInlineChange} style={{ width: '80px' }} />
                          : `${Number(race.officialDistance).toFixed(2)} km`}
                      </td>
                      <td>
                        {isEditing
                          ? <input className="inline-input" name="actualDistance" type="number" step="0.01" min="0.01" value={inlineEditForm.actualDistance} onChange={handleInlineChange} style={{ width: '80px' }} />
                          : `${Number(race.actualDistance).toFixed(2)} km`}
                      </td>
                      <td>
                        {isEditing
                          ? <input className="inline-input" name="officialResult" placeholder="HH:MM:SS" value={inlineEditForm.officialResult} onChange={handleInlineChange} style={{ width: '100px' }} />
                          : race.officialResult}
                      </td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" className="save-btn" onClick={saveInlineEdit}>Save</button>
                            <button type="button" className="secondary" onClick={cancelInlineEdit}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" className="secondary" onClick={() => startInlineEdit(race)}>Edit</button>
                            <button type="button" className="delete-btn" onClick={() => handleDelete(race.id)}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Suspense fallback={<section className="panel"><p className="empty">Loading advanced statistics…</p></section>}>
        <StatsOverview races={sortedRaces} />
      </Suspense>
    </main>
  );
}

export default Dashboard;
