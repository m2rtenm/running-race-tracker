import { useEffect, useMemo, useState } from 'react';
import {
  stravaDisconnect,
  stravaGetActivities,
  stravaGetAuthUrl,
  stravaGetStatus,
  stravaImportSelected,
  stravaSync,
} from '../api';

export default function StravaConnect({ onSyncComplete }) {
  const [status, setStatus] = useState(null); // null | { connected, athleteName, connectedAt }
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [importingSelected, setImportingSelected] = useState(false);
  const [availableRuns, setAvailableRuns] = useState([]);
  const [selectedRunIds, setSelectedRunIds] = useState([]);
  const [filters, setFilters] = useState({
    name: '',
    fromDate: '',
    toDate: '',
    minDistance: '',
    maxDistance: '',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const result = await stravaGetStatus();
      setStatus(result);
    } catch (err) {
      console.error('Failed to get Strava status:', err);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setError(null);
    try {
      const { authUrl } = await stravaGetAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      setError('Failed to initiate Strava connection. Make sure Strava is configured.');
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const result = await stravaSync();
      setSyncResult(result);
      if (result.imported > 0 && onSyncComplete) {
        onSyncComplete();
      }
    } catch (err) {
      setError(err.message || 'Sync failed. Try reconnecting Strava.');
    } finally {
      setSyncing(false);
    }
  }

  async function loadRecentRuns() {
    setPickerLoading(true);
    setError(null);
    try {
      const result = await stravaGetActivities();
      setAvailableRuns(result.runs || []);
      setSelectedRunIds((result.runs || []).filter((run) => !run.imported).map((run) => run.id));
      setShowPicker(true);
    } catch (err) {
      setError(err.message || 'Failed to load Strava runs.');
    } finally {
      setPickerLoading(false);
    }
  }

  function toggleRun(id) {
    setSelectedRunIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  function selectAllRuns() {
    setSelectedRunIds(filteredRuns.filter((run) => !run.imported).map((run) => run.id));
  }

  function clearSelection() {
    setSelectedRunIds([]);
  }

  function resetFilters() {
    setFilters({
      name: '',
      fromDate: '',
      toDate: '',
      minDistance: '',
      maxDistance: '',
    });
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  const filteredRuns = useMemo(() => {
    return availableRuns.filter((run) => {
      if (filters.name && !run.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }

      const runDate = run.startDateLocal?.slice(0, 10) || '';
      if (filters.fromDate && runDate < filters.fromDate) return false;
      if (filters.toDate && runDate > filters.toDate) return false;

      const minDistance = filters.minDistance === '' ? null : Number(filters.minDistance);
      const maxDistance = filters.maxDistance === '' ? null : Number(filters.maxDistance);
      if (minDistance !== null && run.distanceKm < minDistance) return false;
      if (maxDistance !== null && run.distanceKm > maxDistance) return false;

      return true;
    });
  }, [availableRuns, filters]);

  async function handleImportSelected() {
    setImportingSelected(true);
    setSyncResult(null);
    setError(null);
    try {
      const result = await stravaImportSelected(selectedRunIds);
      setSyncResult(result);
      setShowPicker(false);
      if (result.imported > 0 && onSyncComplete) {
        onSyncComplete();
      }
    } catch (err) {
      setError(err.message || 'Selected import failed. Try reconnecting Strava.');
    } finally {
      setImportingSelected(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect Strava? Your imported races will remain.')) return;
    setError(null);
    try {
      await stravaDisconnect();
      setSyncResult(null);
      await loadStatus();
    } catch (err) {
      setError('Failed to disconnect Strava.');
    }
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
          <span>⏳</span> Checking Strava connection…
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Strava brand + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Strava_Logo.svg"
            alt="Strava"
            style={{ height: '28px' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          {status?.connected ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: '600', fontSize: '14px' }}>
              <span>✓</span> Connected{status.athleteName ? ` as ${status.athleteName}` : ''}
            </span>
          ) : (
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Not connected</span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {status?.connected ? (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                style={syncButtonStyle}
              >
                {syncing ? '⏳ Syncing…' : '↻ Sync Runs'}
              </button>
              <button
                onClick={loadRecentRuns}
                disabled={pickerLoading}
                style={pickerButtonStyle}
              >
                {pickerLoading ? '⏳ Loading…' : 'Choose Runs'}
              </button>
              <button
                onClick={handleDisconnect}
                style={disconnectButtonStyle}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button onClick={handleConnect} style={connectButtonStyle}>
              Connect Strava
            </button>
          )}
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div style={resultBoxStyle(syncResult.imported > 0)}>
          <strong>{syncResult.imported > 0 ? '✅' : 'ℹ️'} {syncResult.message}</strong>
          {syncResult.errors > 0 && (
            <span style={{ marginLeft: '8px', color: '#ef4444' }}>
              ({syncResult.errors} failed)
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {showPicker && (
        <div style={pickerStyle}>
          <div style={pickerHeaderStyle}>
            <div>
              <strong>Choose runs to import</strong>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Select the activities you want to bring into your tracker.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={selectAllRuns} style={pickerActionStyle}>Select all</button>
              <button type="button" onClick={clearSelection} style={pickerActionStyle}>Clear</button>
              <button type="button" onClick={resetFilters} style={pickerActionStyle}>Reset filters</button>
              <button type="button" onClick={() => setShowPicker(false)} style={pickerActionStyle}>Close</button>
            </div>
          </div>

          <div style={filterGridStyle}>
            <label style={filterLabelStyle}>
              <span style={filterTextStyle}>Race name</span>
              <input
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                placeholder="Search by title"
                style={filterInputStyle}
              />
            </label>
            <label style={filterLabelStyle}>
              <span style={filterTextStyle}>From date</span>
              <input
                name="fromDate"
                type="date"
                value={filters.fromDate}
                onChange={handleFilterChange}
                style={filterInputStyle}
              />
            </label>
            <label style={filterLabelStyle}>
              <span style={filterTextStyle}>To date</span>
              <input
                name="toDate"
                type="date"
                value={filters.toDate}
                onChange={handleFilterChange}
                style={filterInputStyle}
              />
            </label>
            <label style={filterLabelStyle}>
              <span style={filterTextStyle}>Min distance (km)</span>
              <input
                name="minDistance"
                type="number"
                step="0.1"
                min="0"
                value={filters.minDistance}
                onChange={handleFilterChange}
                style={filterInputStyle}
              />
            </label>
            <label style={filterLabelStyle}>
              <span style={filterTextStyle}>Max distance (km)</span>
              <input
                name="maxDistance"
                type="number"
                step="0.1"
                min="0"
                value={filters.maxDistance}
                onChange={handleFilterChange}
                style={filterInputStyle}
              />
            </label>
          </div>

          <div style={pickerListStyle}>
            {filteredRuns.length === 0 ? (
              <p style={{ margin: 0, color: '#6b7280' }}>No recent runs found.</p>
            ) : (
              filteredRuns.map((run) => {
                const checked = selectedRunIds.includes(run.id);
                return (
                  <label key={run.id} style={pickerRowStyle(run.imported)}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={run.imported}
                      onChange={() => toggleRun(run.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <strong>{run.name}</strong>
                        <span style={{ color: '#6b7280' }}>{run.distanceKm.toFixed(2)} km</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {new Date(run.startDateLocal).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        {' · '}
                        {formatStravaTime(run.elapsedTime)}
                        {run.imported ? ' · already imported' : ''}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {selectedRunIds.filter((id) => filteredRuns.some((run) => run.id === id)).length} selected in filtered list
            </span>
            <button
              type="button"
              onClick={handleImportSelected}
              disabled={importingSelected || selectedRunIds.length === 0}
              style={importSelectedButtonStyle}
            >
              {importingSelected ? '⏳ Importing…' : 'Import selected runs'}
            </button>
          </div>
        </div>
      )}

      {/* Help text when not connected */}
      {!status?.connected && !error && (
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
          Connect Strava to automatically import your running activities as races.
        </p>
      )}
    </div>
  );
}

const containerStyle = {
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  marginBottom: '24px',
};

const connectButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#fc4c02',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
};

const syncButtonStyle = {
  padding: '8px 14px',
  backgroundColor: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
};

const pickerButtonStyle = {
  padding: '8px 14px',
  backgroundColor: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
};

const disconnectButtonStyle = {
  padding: '8px 14px',
  backgroundColor: 'transparent',
  color: '#6b7280',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
};

const pickerStyle = {
  marginTop: '16px',
  padding: '12px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  backgroundColor: '#fff',
};

const pickerHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: '12px',
};

const pickerActionStyle = {
  padding: '6px 10px',
  backgroundColor: '#f3f4f6',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '12px',
  cursor: 'pointer',
};

const pickerListStyle = {
  display: 'grid',
  gap: '8px',
  maxHeight: '320px',
  overflowY: 'auto',
};

const filterGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '10px',
  marginBottom: '12px',
};

const filterLabelStyle = {
  display: 'grid',
  gap: '6px',
};

const filterTextStyle = {
  fontSize: '12px',
  color: '#6b7280',
};

const filterInputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
};

const pickerRowStyle = (disabled) => ({
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-start',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  backgroundColor: disabled ? '#f9fafb' : '#fff',
  opacity: disabled ? 0.7 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

function formatStravaTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours > 0) parts.push(String(hours).padStart(2, '0'));
  parts.push(String(minutes).padStart(2, '0'));
  parts.push(String(seconds).padStart(2, '0'));
  return parts.join(':');
}

const importSelectedButtonStyle = {
  padding: '8px 14px',
  backgroundColor: '#fc4c02',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
};

const resultBoxStyle = (success) => ({
  marginTop: '12px',
  padding: '8px 12px',
  backgroundColor: success ? '#ecfdf5' : '#f3f4f6',
  borderRadius: '6px',
  color: success ? '#065f46' : '#374151',
  fontSize: '13px',
});
