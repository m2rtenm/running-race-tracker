// Cognito configuration
export const COGNITO_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'eu-north-1',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  domain: import.meta.env.VITE_COGNITO_DOMAIN,
  redirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/callback`,
};

const TOKEN_KEY = 'running-race-tracker-token';
const REFRESH_TOKEN_KEY = 'running-race-tracker-refresh-token';
const USER_KEY = 'running-race-tracker-user';

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

export function saveTokens(accessToken, refreshToken, user) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isTokenExpired(token) {
  if (!token) return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() > expiryTime;
  } catch {
    return true;
  }
}

// ============================================================================
// COGNITO AUTHENTICATION
// ============================================================================

export async function signUp(username, password, email) {
  try {
    const response = await fetch(
      `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
        },
        body: JSON.stringify({
          ClientId: COGNITO_CONFIG.clientId,
          Username: username,
          Password: password,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: username },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Sign up failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

export async function signIn(username, password) {
  try {
    const response = await fetch(
      `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          ClientId: COGNITO_CONFIG.clientId,
          AuthFlow: 'USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Sign in failed');
    }

    const data = await response.json();
    const authenticationResult = data.AuthenticationResult;

    if (!authenticationResult) {
      throw new Error('No authentication result received');
    }

    const accessToken = authenticationResult.AccessToken;
    const refreshToken = authenticationResult.RefreshToken;

    // Decode user info from token
    const tokenParts = accessToken.split('.');
    const user = {
      username: username,
      email: username,
      sub: JSON.parse(atob(tokenParts[1])).sub,
    };

    saveTokens(accessToken, refreshToken, user);
    return { user, accessToken, refreshToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(
      `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          ClientId: COGNITO_CONFIG.clientId,
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        }),
      }
    );

    if (!response.ok) {
      clearTokens();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const newAccessToken = data.AuthenticationResult.AccessToken;
    const user = getStoredUser();

    saveTokens(newAccessToken, refreshToken, user);
    return newAccessToken;
  } catch (error) {
    clearTokens();
    console.error('Token refresh error:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      clearTokens();
      return;
    }

    await fetch(
      `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.GlobalSignOut',
        },
        body: JSON.stringify({
          AccessToken: accessToken,
        }),
      }
    );
  } catch (error) {
    console.warn('Sign out error:', error);
  } finally {
    clearTokens();
  }
}

export function isAuthenticated() {
  const token = getAccessToken();
  return !isTokenExpired(token);
}
