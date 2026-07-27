import { Router } from '../router.js';
import { listRacesByUser } from '../services/dynamodb.js';

const router = new Router();
const basePath = '/stats';

// GET /stats/summary - Summary statistics
router.get(`${basePath}/summary`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const races = await listRacesByUser(request.userId);

  const summary = {
    totalRaces: races.length,
    totalDistance: races.reduce((sum, r) => sum + Number(r.actualDistance || 0), 0),
    averageTime: races.length ? Math.round(races.reduce((sum, r) => sum + r.officialResultSeconds, 0) / races.length) : 0,
    bestTime: races.length ? Math.min(...races.map(r => r.officialResultSeconds)) : null,
    yearsTracked: new Set(races.map(r => new Date(r.date).getFullYear())).size,
  };

  return { statusCode: 200, body: summary };
});

// GET /stats/by-distance - Statistics grouped by distance
router.get(`${basePath}/by-distance`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const races = await listRacesByUser(request.userId);
  const grouped = new Map();

  for (const race of races) {
    const key = `${Number(race.officialDistance).toFixed(1)} km`;
    if (!grouped.has(key)) {
      grouped.set(key, { count: 0, totalTime: 0, bestTime: Infinity, totalDistance: 0 });
    }
    const bucket = grouped.get(key);
    bucket.count += 1;
    bucket.totalTime += race.officialResultSeconds;
    bucket.bestTime = Math.min(bucket.bestTime, race.officialResultSeconds);
    bucket.totalDistance += Number(race.actualDistance || 0);
  }

  const stats = [...grouped.entries()].map(([label, values]) => ({
    label,
    count: values.count,
    averageTime: Math.round(values.totalTime / values.count),
    bestTime: values.bestTime === Infinity ? null : values.bestTime,
    averagePace: values.count ? (values.totalTime / (values.totalDistance || Number(label))) : 0,
  })).sort((a, b) => Number(a.label.split(' ')[0]) - Number(b.label.split(' ')[0]));

  return { statusCode: 200, body: stats };
});

// GET /stats/by-year - Statistics grouped by year
router.get(`${basePath}/by-year`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const races = await listRacesByUser(request.userId);
  const grouped = new Map();

  for (const race of races) {
    const year = new Date(race.date).getFullYear();
    const key = String(year);
    if (!grouped.has(key)) {
      grouped.set(key, { count: 0, totalTime: 0, bestTime: Infinity });
    }
    const bucket = grouped.get(key);
    bucket.count += 1;
    bucket.totalTime += race.officialResultSeconds;
    bucket.bestTime = Math.min(bucket.bestTime, race.officialResultSeconds);
  }

  const stats = [...grouped.entries()].map(([label, values]) => ({
    label,
    count: values.count,
    averageTime: Math.round(values.totalTime / values.count),
    bestTime: values.bestTime === Infinity ? null : values.bestTime,
  })).sort((a, b) => Number(b.label) - Number(a.label));

  return { statusCode: 200, body: stats };
});

// GET /stats/by-competition - Statistics by competition
router.get(`${basePath}/by-competition`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const races = await listRacesByUser(request.userId);
  const grouped = new Map();

  for (const race of races) {
    const year = new Date(race.date).getFullYear();
    const key = `${race.competitionName.toLowerCase()}::${year}`;
    if (!grouped.has(key)) {
      grouped.set(key, { competitionName: race.competitionName, year, count: 0, totalTime: 0, bestTime: Infinity });
    }
    const bucket = grouped.get(key);
    bucket.count += 1;
    bucket.totalTime += race.officialResultSeconds;
    bucket.bestTime = Math.min(bucket.bestTime, race.officialResultSeconds);
  }

  const stats = [...grouped.values()].map(values => ({
    competitionName: values.competitionName,
    year: values.year,
    count: values.count,
    averageTime: Math.round(values.totalTime / values.count),
    bestTime: values.bestTime === Infinity ? null : values.bestTime,
  })).sort((a, b) => a.competitionName.localeCompare(b.competitionName) || b.year - a.year);

  return { statusCode: 200, body: stats };
});

// GET /stats/prs - Personal records by distance
router.get(`${basePath}/prs`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const races = await listRacesByUser(request.userId);
  const prs = new Map();

  for (const race of races) {
    const distanceKey = Number(race.officialDistance).toFixed(1);
    if (!prs.has(distanceKey)) {
      prs.set(distanceKey, race);
    } else {
      const current = prs.get(distanceKey);
      if (race.officialResultSeconds < current.officialResultSeconds) {
        prs.set(distanceKey, race);
      }
    }
  }

  const results = [...prs.entries()]
    .map(([distance, race]) => ({
      distance: `${distance} km`,
      competitionName: race.competitionName,
      date: race.date,
      time: race.officialResult,
      seconds: race.officialResultSeconds,
    }))
    .sort((a, b) => Number(a.distance) - Number(b.distance));

  return { statusCode: 200, body: results };
});

// GET /stats/consistency - Consistency metrics
router.get(`${basePath}/consistency`, async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  const races = await listRacesByUser(request.userId);
  
  if (races.length < 2) {
    return { statusCode: 200, body: { message: 'Need at least 2 races for consistency metrics' } };
  }

  // Sort by date
  const sorted = [...races].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate month-by-month consistency
  const monthCounts = new Map();
  for (const race of sorted) {
    const date = new Date(race.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
  }

  // Calculate trend
  const times = sorted.map(r => r.officialResultSeconds);
  const firstHalf = times.slice(0, Math.floor(times.length / 2));
  const secondHalf = times.slice(Math.floor(times.length / 2));
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const improvement = ((avgFirst - avgSecond) / avgFirst) * 100;

  const consistency = {
    racesPerMonth: monthCounts.size ? Math.round(races.length / monthCounts.size) : 0,
    monthsActive: monthCounts.size,
    averagePaceImprovement: improvement.toFixed(2),
    trend: improvement > 0 ? 'improving' : 'declining',
  };

  return { statusCode: 200, body: consistency };
});

export default router;
