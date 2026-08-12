import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import './App.css';

const StravaCallbackPage = lazy(() => import('./pages/StravaCallbackPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));

function isStravaCallback() {
  return window.location.pathname === '/strava/callback';
}

function isAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const isExplicitCallbackPath = window.location.pathname === '/callback';
  const isRootHostedUiCallback =
    window.location.pathname === '/' &&
    params.has('code') &&
    params.has('state');

  return isExplicitCallbackPath || isRootHostedUiCallback;
}

function AppContent() {
  const { isAuthenticated, logout } = useAuth();

  if (isAuthenticated) {
    if (isStravaCallback()) {
      return (
        <Suspense fallback={null}>
          <StravaCallbackPage />
        </Suspense>
      );
    }

    return <Dashboard onLogout={logout} />;
  }

  if (isStravaCallback()) {
    window.location.replace('/');
    return null;
  }

  if (isAuthCallback()) {
    return (
      <Suspense fallback={null}>
        <AuthCallbackPage />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
