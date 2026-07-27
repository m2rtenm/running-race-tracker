import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import './App.css';

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const [showDashboard, setShowDashboard] = useState(isAuthenticated);

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
