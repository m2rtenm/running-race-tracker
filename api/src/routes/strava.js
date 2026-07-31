import { Router } from '../router.js';
import {
  saveStravaTokens,
  getStravaTokens,
  deleteStravaTokens,
  getStravaImportedActivityIds,
  createRace,
} from '../services/dynamodb.js';

const router = new Router();
const basePath = '/strava';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';

// ============================================================================
// HELPERS
// ============================================================================

function secondsToTimeString(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h > 0) parts.push(String(h).padStart(2, '0'));
  parts.push(String(m).padStart(2, '0'));
  parts.push(String(s).padStart(2, '0'));
  return parts.join(':');
}

function mapActivityToRace(activity) {
  const distanceKm = parseFloat((activity.distance / 1000).toFixed(2));
  const dateStr = activity.start_date_local.substring(0, 10); // YYYY-MM-DD

  return {
    competitionName: activity.name,
    date: dateStr,
    officialDistance: distanceKm,
    actualDistance: distanceKm,
    officialResultSeconds: activity.elapsed_time,
    officialResult: secondsToTimeString(activity.elapsed_time),
    stravaId: String(activity.id),
    source: 'strava',
  };
}

async function refreshStravaTokenIfNeeded(tokens) {
  const nowUnix = Math.floor(Date.now() / 1000);
  // Refresh if token expires within 5 minutes
  if (tokens.expiresAt > nowUnix + 300) {
    return tokens;
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw { statusCode: 502, body: { error: `Strava token refresh failed: ${text}` } };
  }

  return await res.json();
}

// ============================================================================
// ROUTES
// ============================================================================

// GET /strava/auth - Return Strava OAuth URL for the frontend to redirect to
router.get(`${basePath}/auth`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;

  if (!clientId) {
    throw { statusCode: 503, body: { error: 'Strava integration not configured' } };
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  });

  return {
    statusCode: 200,
    body: { authUrl: `https://www.strava.com/oauth/authorize?${params}` },
  };
});

// GET /strava/status - Check if user has connected Strava
router.get(`${basePath}/status`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const tokens = await getStravaTokens(request.userId);

  if (!tokens) {
    return { statusCode: 200, body: { connected: false } };
  }

  return {
    statusCode: 200,
    body: {
      connected: true,
      athleteName: tokens.athleteName,
      athleteId: tokens.athleteId,
      connectedAt: tokens.updatedAt,
    },
  };
});

// POST /strava/exchange - Exchange OAuth code for tokens
router.post(`${basePath}/exchange`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const { code } = request.body || {};

  if (!code) {
    throw { statusCode: 400, body: { error: 'Authorization code is required' } };
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw { statusCode: 503, body: { error: 'Strava integration not configured' } };
  }

  // Exchange authorization code for tokens
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw { statusCode: 400, body: { error: `Strava token exchange failed: ${text}` } };
  }

  const tokenData = await res.json();
  await saveStravaTokens(request.userId, tokenData);

  return {
    statusCode: 200,
    body: {
      connected: true,
      athleteName: tokenData.athlete ? `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}` : null,
    },
  };
});

// POST /strava/sync - Fetch activities from Strava and import as races
router.post(`${basePath}/sync`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  let tokens = await getStravaTokens(request.userId);

  if (!tokens) {
    throw { statusCode: 400, body: { error: 'Strava not connected. Please connect first.' } };
  }

  // Refresh token if needed
  const freshTokenData = await refreshStravaTokenIfNeeded(tokens);
  if (freshTokenData !== tokens) {
    // Token was refreshed — save the new tokens
    await saveStravaTokens(request.userId, {
      access_token: freshTokenData.access_token,
      refresh_token: freshTokenData.refresh_token,
      expires_at: freshTokenData.expires_at,
    });
    tokens = { ...tokens, accessToken: freshTokenData.access_token };
  }

  // Get already-imported Strava activity IDs to avoid duplicates
  const importedIds = await getStravaImportedActivityIds(request.userId);
  const importedSet = new Set(importedIds);

  // Fetch activities from Strava (runs only, paginated)
  let page = 1;
  const allRuns = [];

  while (true) {
    const params = new URLSearchParams({
      per_page: '100',
      page: String(page),
    });

    const activitiesRes = await fetch(`${STRAVA_ACTIVITIES_URL}?${params}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!activitiesRes.ok) {
      const text = await activitiesRes.text();
      throw { statusCode: 502, body: { error: `Strava API error: ${text}` } };
    }

    const activities = await activitiesRes.json();
    if (activities.length === 0) break;

    // Filter to running activities only
    const runs = activities.filter((a) => a.type === 'Run' || a.sport_type === 'Run');
    allRuns.push(...runs);

    // Stop if we got fewer than 100 (last page)
    if (activities.length < 100) break;
    page += 1;
  }

  // Filter out already-imported activities
  const newRuns = allRuns.filter((a) => !importedSet.has(String(a.id)));

  // Import new runs as races
  const imported = [];
  const errors = [];

  for (const activity of newRuns) {
    try {
      const raceData = mapActivityToRace(activity);
      const race = await createRace(request.userId, raceData);
      imported.push(race);
    } catch (err) {
      errors.push({ activityId: activity.id, name: activity.name, error: err.message });
    }
  }

  return {
    statusCode: 200,
    body: {
      imported: imported.length,
      skipped: allRuns.length - newRuns.length,
      errors: errors.length,
      errorDetails: errors,
      message: `Imported ${imported.length} new runs, skipped ${allRuns.length - newRuns.length} already imported.`,
    },
  };
});

// DELETE /strava/disconnect - Remove Strava connection
router.delete(`${basePath}/disconnect`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  await deleteStravaTokens(request.userId);

  return { statusCode: 200, body: { disconnected: true } };
});

export default router;
