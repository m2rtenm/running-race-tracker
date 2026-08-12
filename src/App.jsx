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
  return window.location.pathname === '/callback' || params.has('code');
}

function AppContent() {
  const { isAuthenticated, logout } = useAuth();

  if (isStravaCallback()) {
    if (!isAuthenticated) {
      window.location.replace('/');
      return null;
    }
    return (
      <Suspense fallback={null}>
        <StravaCallbackPage />
      </Suspense>
    );
  }

  if (isAuthCallback()) {
    return (
      <Suspense fallback={null}>
        <AuthCallbackPage onComplete={() => {}} />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard onLogout={logout} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
