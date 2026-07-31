import { useEffect, useState } from 'react';
import { stravaGetAuthUrl, stravaGetStatus, stravaSync, stravaDisconnect } from '../api';

export default function StravaConnect({ onSyncComplete }) {
  const [status, setStatus] = useState(null); // null | { connected, athleteName, connectedAt }
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
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

const disconnectButtonStyle = {
  padding: '8px 14px',
  backgroundColor: 'transparent',
  color: '#6b7280',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '13px',
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
