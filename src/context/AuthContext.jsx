import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signIn,
  signUp,
  signOut,
  signInWithGoogle,
  completeHostedUiSignIn,
  getAccessToken,
  getStoredUser,
  isAuthenticated,
  refreshAccessToken,
  isTokenExpired,
} from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getAccessToken();
        const storedUser = getStoredUser();

        if (token && storedUser) {
          // Check if token is expired and refresh if needed
          if (isTokenExpired(token)) {
            try {
              await refreshAccessToken();
            } catch {
              // Refresh failed, user needs to log in again
              setUser(null);
              setIsLoading(false);
              return;
            }
          }
          setUser(storedUser);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: loginUser } = await signIn(username, password);
      setUser(loginUser);
      return loginUser;
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username, password, email) => {
    setIsLoading(true);
    setError(null);
    try {
      await signUp(username, password, email);
      // After successful signup, automatically sign in
      const { user: newUser } = await signIn(username, password);
      setUser(newUser);
      return newUser;
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    await signInWithGoogle();
  };

  const completeGoogleCallback = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: oauthUser } = await completeHostedUiSignIn(window.location.href);
      setUser(oauthUser);
      return oauthUser;
    } catch (err) {
      const errorMessage = err.message || 'Google sign-in failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isAuthenticated: isAuthenticated(),
        login,
        register,
        logout,
        loginWithGoogle,
        completeGoogleCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
