// Cognito configuration
export const COGNITO_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'eu-north-1',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  domain: import.meta.env.VITE_COGNITO_DOMAIN,
  redirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/`,
};

const TOKEN_KEY = 'running-race-tracker-token';
const REFRESH_TOKEN_KEY = 'running-race-tracker-refresh-token';
const USER_KEY = 'running-race-tracker-user';
const OAUTH_STATE_KEY = 'running-race-tracker-oauth-state';
const OAUTH_VERIFIER_KEY = 'running-race-tracker-oauth-verifier';

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

export function saveTokens(accessToken, refreshToken, user) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
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

function base64UrlEncode(input) {
  const base64 = typeof input === 'string' ? btoa(input) : btoa(String.fromCharCode(...new Uint8Array(input)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateRandomString(length) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer).slice(0, length);
}

async function generateCodeChallenge(verifier) {
  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );
  return base64UrlEncode(digest);
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  return JSON.parse(atob(parts[1]));
}

// ============================================================================
// COGNITO AUTHENTICATION
// ============================================================================

export async function signInWithGoogle() {
  if (!COGNITO_CONFIG.domain) {
    throw new Error('VITE_COGNITO_DOMAIN is missing');
  }
  if (!COGNITO_CONFIG.clientId) {
    throw new Error('VITE_COGNITO_CLIENT_ID is missing');
  }

  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setItem(OAUTH_STATE_KEY, state);
  sessionStorage.setItem(OAUTH_VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    identity_provider: 'Google',
    response_type: 'code',
    client_id: COGNITO_CONFIG.clientId,
    redirect_uri: COGNITO_CONFIG.redirectUri,
    scope: 'openid email profile',
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  window.location.assign(`https://${COGNITO_CONFIG.domain}/oauth2/authorize?${params.toString()}`);
}

export async function completeHostedUiSignIn(callbackUrl = window.location.href) {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    throw new Error(errorDescription || error);
  }
  if (!code) {
    throw new Error('Missing authorization code');
  }

  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  const codeVerifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY);

  if (!expectedState || state !== expectedState) {
    throw new Error('Invalid OAuth state');
  }
  if (!codeVerifier) {
    throw new Error('Missing OAuth code verifier');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: COGNITO_CONFIG.clientId,
    code,
    redirect_uri: COGNITO_CONFIG.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`https://${COGNITO_CONFIG.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Hosted UI token exchange failed');
  }

  const tokenResult = await response.json();
  const accessToken = tokenResult.access_token;
  const refreshToken = tokenResult.refresh_token;
  const idToken = tokenResult.id_token;

  if (!accessToken) {
    throw new Error('Hosted UI did not return an access token');
  }

  const payload = idToken ? decodeJwtPayload(idToken) : decodeJwtPayload(accessToken);
  if (!payload) {
    throw new Error('Invalid token payload');
  }

  const user = {
    username: payload['cognito:username'] || payload.email || payload.sub,
    email: payload.email || '',
    sub: payload.sub,
  };

  saveTokens(accessToken, refreshToken, user);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_VERIFIER_KEY);

  return { user, accessToken, refreshToken };
}

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
