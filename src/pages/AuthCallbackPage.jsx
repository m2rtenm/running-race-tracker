import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function AuthCallbackPage({ onComplete }) {
  const { completeGoogleCallback, error } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      try {
        await completeGoogleCallback();
        if (!cancelled) {
          window.history.replaceState({}, document.title, '/');
          onComplete();
        }
      } catch {
        if (!cancelled) {
          window.history.replaceState({}, document.title, '/');
        }
      }
    }

    complete();
    return () => {
      cancelled = true;
    };
  }, [completeGoogleCallback, onComplete]);

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h2>Completing sign-in…</h2>
          {error ? <div className="error-message">{error}</div> : null}
        </div>
      </div>
    </main>
  );
}

export default AuthCallbackPage;
