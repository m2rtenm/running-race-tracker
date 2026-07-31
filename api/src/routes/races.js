import { Router } from '../router.js';
import { listRacesByUser, getRaceById, createRace, updateRace, deleteRace } from '../services/dynamodb.js';

const router = new Router();
const basePath = '/races';

// GET /races - List all races for user
router.get(`${basePath}`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const races = await listRacesByUser(request.userId);
  return { statusCode: 200, body: races };
});

// POST /races - Create new race
router.post(`${basePath}`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const { competitionName, date, officialDistance, officialResult, officialResultSeconds, actualDistance } = request.body;

  if (!competitionName || !date || !officialDistance || !actualDistance || !officialResultSeconds) {
    throw {
      statusCode: 400,
      body: { error: 'Missing required fields' },
    };
  }

  const race = await createRace(request.userId, {
    competitionName,
    date,
    officialDistance,
    officialResult,
    officialResultSeconds,
    actualDistance,
  });

  return { statusCode: 201, body: race };
});

// GET /races/:raceId - Get single race
router.get(`${basePath}/:raceId`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const race = await getRaceById(request.userId, request.params.raceId);

  if (!race) {
    throw { statusCode: 404, body: { error: 'Race not found' } };
  }

  return { statusCode: 200, body: race };
});

// PUT /races/:raceId - Update race
router.put(`${basePath}/:raceId`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const race = await getRaceById(request.userId, request.params.raceId);
  if (!race) {
    throw { statusCode: 404, body: { error: 'Race not found' } };
  }

  const updates = {
    competitionName: request.body.competitionName ?? race.competitionName,
    date: request.body.date ?? race.date,
    officialDistance: request.body.officialDistance ?? race.officialDistance,
    officialResult: request.body.officialResult ?? race.officialResult,
    officialResultSeconds: request.body.officialResultSeconds ?? race.officialResultSeconds,
    actualDistance: request.body.actualDistance ?? race.actualDistance,
  };

  const updated = await updateRace(request.userId, request.params.raceId, updates);
  return { statusCode: 200, body: updated };
});

// DELETE /races/:raceId - Delete race
router.delete(`${basePath}/:raceId`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const race = await getRaceById(request.userId, request.params.raceId);
  if (!race) {
    throw { statusCode: 404, body: { error: 'Race not found' } };
  }

  await deleteRace(request.userId, request.params.raceId);
  return { statusCode: 200, body: { success: true } };
});

export default router;
