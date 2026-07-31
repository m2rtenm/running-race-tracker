import { useEffect, useState } from 'react';
import { stravaExchangeCode } from '../api';

export default function StravaCallbackPage() {
  const [state, setState] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setState('error');
      setErrorMessage(error === 'access_denied' ? 'You denied access to Strava.' : `Strava error: ${error}`);
      return;
    }

    if (!code) {
      setState('error');
      setErrorMessage('No authorization code received from Strava.');
      return;
    }

    stravaExchangeCode(code)
      .then(() => {
        setState('success');
        // Redirect to home after 2s
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      })
      .catch((err) => {
        setState('error');
        setErrorMessage(err.message || 'Failed to connect Strava account.');
      });
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {state === 'processing' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Connecting Strava…</h2>
            <p style={{ color: '#6b7280', margin: 0 }}>Please wait while we link your account.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#065f46' }}>Strava Connected!</h2>
            <p style={{ color: '#6b7280', margin: '0 0 16px 0' }}>
              Your Strava account is now linked. Redirecting you back…
            </p>
            <div
              style={{
                height: '4px',
                backgroundColor: '#d1fae5',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  backgroundColor: '#10b981',
                  animation: 'progress 2s linear forwards',
                }}
              />
            </div>
            <style>{`
              @keyframes progress { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); transform-origin: left; } }
            `}</style>
          </>
        )}

        {state === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Connection Failed</h2>
            <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>{errorMessage}</p>
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                padding: '10px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
