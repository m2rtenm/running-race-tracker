import { Router } from '../router.js';
import { createStravaImport } from '../services/dynamodb.js';

const router = new Router();
const basePath = '/strava';

// POST /strava/auth - Initiate Strava OAuth
router.post(`${basePath}/auth`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const stravaClientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI || `${request.headers['host']}/strava/callback`;

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&redirect_uri=${redirectUri}&response_type=code&scope=profile:read_all,activity:read_all`;

  return {
    statusCode: 200,
    body: { authUrl },
  };
});

// GET /strava/callback - Handle OAuth callback
router.get(`${basePath}/callback`, async (request) => {
  // TODO: Implement Strava OAuth callback
  return {
    statusCode: 200,
    body: { message: 'Strava callback - implementation pending' },
  };
});

// POST /strava/sync - Manually trigger Strava sync
router.post(`${basePath}/sync`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  // TODO: Implement Strava sync logic
  return {
    statusCode: 202,
    body: { message: 'Strava sync initiated' },
  };
});

export default router;
