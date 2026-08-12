import { Router } from './router.js';
import { auth } from './middleware/auth.js';
import racesRoutes from './routes/races.js';
import statsRoutes from './routes/stats.js';
import stravaRoutes from './routes/strava.js';

const router = new Router();

// Apply auth middleware to all routes
router.use(auth);

// Mount route modules
router.use(racesRoutes);
router.use(statsRoutes);
router.use(stravaRoutes);

// Health check (no auth required)
router.get('/health', async (request) => {
  return { statusCode: 200, body: { status: 'ok' } };
});

export async function handler(event, context) {
  try {
    return await router.handle(event);
  } catch (error) {
    console.error('Unhandled error:', error);
    if (error.statusCode && error.body) {
      throw error;
    }
    throw {
      statusCode: 500,
      body: { error: 'Internal server error' },
    };
  }
}
