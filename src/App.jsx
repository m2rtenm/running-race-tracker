import { lazy, Suspense, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import './App.css';

const StravaCallbackPage = lazy(() => import('./pages/StravaCallbackPage'));

// Detect if current URL is the Strava OAuth callback
function isStravaCallback() {
  return window.location.pathname === '/strava/callback';
}

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const [showDashboard, setShowDashboard] = useState(isAuthenticated);

  // Handle Strava callback before anything else (user must be logged in)
  if (isStravaCallback()) {
    if (!isAuthenticated) {
      // Not logged in — redirect to home so they authenticate first
      window.location.replace('/');
      return null;
    }
    return (
      <Suspense fallback={null}>
        <StravaCallbackPage />
      </Suspense>
    );
  }

  const handleLogout = async () => {
    await logout();
    setShowDashboard(false);
  };

  const handleLogin = () => {
    setShowDashboard(true);
  };

  if (!showDashboard) {
    return <LoginPage onNavigateToDashboard={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
