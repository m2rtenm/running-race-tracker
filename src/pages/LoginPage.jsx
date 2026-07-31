import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

function LoginPage() {
  const { loginWithGoogle, isLoading, error: authError } = useAuth();

  return (
    <main className="auth-page">
      <div className="auth-container auth-container--centered">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">🏃</div>
            <h1>Running Race Tracker</h1>
            <p>Your personal running competition history</p>
          </div>

          {authError && (
            <div className="error-message">{authError}</div>
          )}

          <button
            type="button"
            disabled={isLoading}
            className="auth-button google-button"
            onClick={() => loginWithGoogle()}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
            </svg>
            {isLoading ? 'Redirecting to Google…' : 'Sign in with Google'}
          </button>

          <p className="auth-private-note">🔒 Private app — access by invitation only</p>
        </div>

        <div className="auth-info">
          <h3>Your running journey, tracked</h3>
          <ul>
            <li>📊 Personal records by distance</li>
            <li>📈 Pace trends over time</li>
            <li>📅 Yearly summaries</li>
            <li>🔥 Consistency tracking</li>
            <li>🔗 Strava import</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
