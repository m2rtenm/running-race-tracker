import { getAccessToken, refreshAccessToken, isTokenExpired } from './services/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  let token = getAccessToken();

  // Refresh token if expired
  if (token && isTokenExpired(token)) {
    try {
      token = await refreshAccessToken();
    } catch (error) {
      // Token refresh failed, let request fail with 401
      console.warn('Token refresh failed:', error);
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid, clear auth
      throw new Error('Unauthorized - please log in again');
    }
    const payload = await response.text();
    throw new Error(payload || `Request failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function listRaces() {
  return request('/races');
}

export async function createRace(race) {
  return request('/races', { method: 'POST', body: JSON.stringify(race) });
}

export async function updateRace(raceId, race) {
  return request(`/races/${raceId}`, { method: 'PUT', body: JSON.stringify(race) });
}

export async function deleteRaceById(raceId) {
  return request(`/races/${raceId}`, { method: 'DELETE' });
}

export async function getStats(endpoint = 'summary') {
  return request(`/stats/${endpoint}`);
}

export async function getStatsSummary() {
  return request('/stats/summary');
}

export async function getStatsByDistance() {
  return request('/stats/by-distance');
}

export async function getStatsByYear() {
  return request('/stats/by-year');
}

export async function getStatsByCompetition() {
  return request('/stats/by-competition');
}

export async function getPersonalRecords() {
  return request('/stats/prs');
}

export async function getConsistencyStats() {
  return request('/stats/consistency');
}

// ============================================================================
// STRAVA API
// ============================================================================

export async function stravaGetAuthUrl() {
  return request('/strava/auth');
}

export async function stravaGetStatus() {
  return request('/strava/status');
}

export async function stravaExchangeCode(code) {
  return request('/strava/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function stravaSync() {
  return request('/strava/sync', { method: 'POST' });
}

export async function stravaGetActivities() {
  return request('/strava/activities');
}

export async function stravaImportSelected(activityIds) {
  return request('/strava/import-selected', {
    method: 'POST',
    body: JSON.stringify({ activityIds }),
  });
}

export async function stravaDisconnect() {
  return request('/strava/disconnect', { method: 'DELETE' });
}
