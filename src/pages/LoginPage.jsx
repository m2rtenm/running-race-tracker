import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

function LoginPage({ onNavigateToDashboard }) {
  const { login, register, loginWithGoogle, isLoading, error: authError } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password, email);
      }
      onNavigateToDashboard();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Running Race Tracker</h1>
            <p>Track your running competitions and personal records</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>

            <label>
              <span>Username / Email</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your-username"
                required
                disabled={isLoading}
              />
            </label>

            {mode === 'register' && (
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                />
              </label>
            )}

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </label>

            {mode === 'register' && (
              <p className="password-hint">
                Password must be at least 8 characters with uppercase, lowercase, and numbers.
              </p>
            )}

            {(error || authError) && (
              <div className="error-message">
                {error || authError}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="auth-button">
              {isLoading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                disabled={isLoading}
                className="auth-button"
                onClick={() => loginWithGoogle()}
              >
                Continue with Google
              </button>
            )}
          </form>

          <div className="auth-footer">
            <p>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                  setUsername('');
                  setPassword('');
                  setEmail('');
                }}
                className="auth-link"
                disabled={isLoading}
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        <div className="auth-info">
          <h3>About This App</h3>
          <ul>
            <li>✓ Track all your running competitions</li>
            <li>✓ View personal records by distance</li>
            <li>✓ Analyze performance trends over time</li>
            <li>✓ Private account - only you can access your data</li>
            <li>✓ Powered by AWS Cognito authentication</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
