import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

function AuthCallbackPage() {
  const { completeGoogleCallback, error, isAuthenticated } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return undefined;
    }
    startedRef.current = true;

    let cancelled = false;

    async function complete() {
      try {
        await completeGoogleCallback();
        if (!cancelled) {
          window.history.replaceState({}, document.title, '/');
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
  }, [completeGoogleCallback]);

  useEffect(() => {
    if (isAuthenticated) {
      window.history.replaceState({}, document.title, '/');
    }
  }, [isAuthenticated]);

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
