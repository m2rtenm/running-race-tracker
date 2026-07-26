const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
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
