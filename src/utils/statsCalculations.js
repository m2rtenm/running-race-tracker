/**
 * Distance buckets for categorizing races
 */
export const DISTANCE_BUCKETS = {
  SPRINT: { name: 'Sprint', min: 0, max: 4.99 },
  FIVE_K: { name: '5K', min: 5, max: 5.99 },
  TEN_K: { name: '10K', min: 10, max: 10.99 },
  HALF_MARATHON: { name: 'Half Marathon', min: 21, max: 21.2 },
  MARATHON: { name: 'Marathon', min: 42, max: 42.3 },
  ULTRA: { name: 'Ultra', min: 42.31, max: Infinity },
};

/**
 * Get distance bucket for a given distance in km
 */
export const getDistanceBucket = (distanceKm) => {
  for (const [key, bucket] of Object.entries(DISTANCE_BUCKETS)) {
    if (distanceKm >= bucket.min && distanceKm <= bucket.max) {
      return bucket.name;
    }
  }
  return 'Other';
};

/**
 * Calculate pace in min/km from duration (minutes) and distance (km)
 */
export const calculatePace = (durationMinutes, distanceKm) => {
  if (!distanceKm || distanceKm === 0) return 0;
  return durationMinutes / distanceKm;
};

/**
 * Format pace as "MM:SS per km"
 */
export const formatPace = (paceMinPerKm) => {
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
};

/**
 * Calculate duration in minutes from hours and seconds
 */
export const calculateDurationMinutes = (hours, minutes, seconds) => {
  return hours * 60 + minutes + seconds / 60;
};

/**
 * Find personal record for each distance bucket
 * Returns array of { distance, pace, time, date, raceName }
 */
export const calculatePRs = (races) => {
  const prs = {};

  races.forEach((race) => {
    const dist = race.officialDistance || race.distance || 0;
    const bucket = getDistanceBucket(dist);
    const durationMinutes = (race.officialResultSeconds || 0) / 60;
    const pace = calculatePace(durationMinutes, dist);

    if (!prs[bucket]) {
      prs[bucket] = { distance: bucket, pace, time: durationMinutes, date: race.date, raceName: race.competitionName || race.name };
    } else if (pace < prs[bucket].pace) {
      prs[bucket] = { distance: bucket, pace, time: durationMinutes, date: race.date, raceName: race.competitionName || race.name };
    }
  });

  return Object.values(prs)
    .sort((a, b) => a.pace - b.pace)
    .map((pr) => ({
      ...pr,
      formattedPace: formatPace(pr.pace),
    }));
};

/**
 * Calculate average pace by distance bucket
 * Returns array of { distance, avgPace, count, minPace, maxPace }
 */
export const calculatePaceByDistance = (races) => {
  const byDistance = {};

  races.forEach((race) => {
    const dist = race.officialDistance || race.distance || 0;
    const bucket = getDistanceBucket(dist);
    const durationMinutes = (race.officialResultSeconds || 0) / 60;
    const pace = calculatePace(durationMinutes, dist);

    if (!byDistance[bucket]) {
      byDistance[bucket] = { paces: [], distance: bucket };
    }
    byDistance[bucket].paces.push(pace);
  });

  return Object.values(byDistance)
    .map((item) => ({
      distance: item.distance,
      avgPace: item.paces.reduce((a, b) => a + b, 0) / item.paces.length,
      count: item.paces.length,
      minPace: Math.min(...item.paces),
      maxPace: Math.max(...item.paces),
    }))
    .map((item) => ({
      ...item,
      avgFormattedPace: formatPace(item.avgPace),
    }))
    .sort((a, b) => a.avgPace - b.avgPace);
};

/**
 * Calculate yearly statistics
 * Returns array of { year, totalRaces, totalDistance, avgPace, minPace, maxPace }
 */
export const calculateYearlyStats = (races) => {
  const byYear = {};

  races.forEach((race) => {
    const year = new Date(race.date).getFullYear();
    const dist = race.officialDistance || race.distance || 0;
    const durationMinutes = (race.officialResultSeconds || 0) / 60;
    const pace = calculatePace(durationMinutes, dist);

    if (!byYear[year]) {
      byYear[year] = {
        totalRaces: 0,
        totalDistance: 0,
        paces: [],
      };
    }
    byYear[year].totalRaces += 1;
    byYear[year].totalDistance += dist;
    byYear[year].paces.push(pace);
  });

  return Object.entries(byYear)
    .map(([year, data]) => ({
      year: parseInt(year),
      totalRaces: data.totalRaces,
      totalDistance: data.totalDistance.toFixed(2),
      avgPace: data.paces.reduce((a, b) => a + b, 0) / data.paces.length,
      minPace: Math.min(...data.paces),
      maxPace: Math.max(...data.paces),
    }))
    .map((item) => ({
      ...item,
      avgFormattedPace: formatPace(item.avgPace),
      bestFormattedPace: formatPace(item.minPace),
    }))
    .sort((a, b) => b.year - a.year);
};

/**
 * Calculate consistency metrics
 * Returns { monthlyFrequency, streak, improvement }
 */
export const calculateConsistency = (races) => {
  const monthlyRaces = {};

  races.forEach((race) => {
    const date = new Date(race.date);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyRaces[yearMonth] = (monthlyRaces[yearMonth] || 0) + 1;
  });

  // Calculate streak
  let streak = 0;
  let maxStreak = 0;
  const sortedMonths = Object.keys(monthlyRaces).sort();
  const allMonths = generateMonthRange(sortedMonths[0], sortedMonths[sortedMonths.length - 1]);

  allMonths.forEach((month) => {
    if (monthlyRaces[month]) {
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  });

  // Calculate improvement
  const months = sortedMonths.slice(-2);
  let improvement = 0;
  if (months.length === 2) {
    const prev = monthlyRaces[months[0]];
    const curr = monthlyRaces[months[1]];
    improvement = ((curr - prev) / prev * 100).toFixed(1);
  }

  return {
    monthlyFrequency: Object.entries(monthlyRaces)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    currentStreak: streak,
    maxStreak,
    improvement: parseFloat(improvement),
  };
};

/**
 * Generate array of months between start and end
 */
const generateMonthRange = (startMonth, endMonth) => {
  const [startYear, startM] = startMonth.split('-').map(Number);
  const [endYear, endM] = endMonth.split('-').map(Number);
  const months = [];
  let current = new Date(startYear, startM - 1);
  const end = new Date(endYear, endM - 1);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
};

/**
 * Calculate statistics by competition
 * Returns array of { competition, totalRaces, avgPace, totalDistance }
 */
export const calculateByCompetition = (races) => {
  const byCompetition = {};

  races.forEach((race) => {
    const comp = race.competitionName || race.competition || 'Uncategorized';
    const dist = race.officialDistance || race.distance || 0;
    const durationMinutes = (race.officialResultSeconds || 0) / 60;
    const pace = calculatePace(durationMinutes, dist);

    if (!byCompetition[comp]) {
      byCompetition[comp] = {
        totalRaces: 0,
        totalDistance: 0,
        paces: [],
      };
    }
    byCompetition[comp].totalRaces += 1;
    byCompetition[comp].totalDistance += dist;
    byCompetition[comp].paces.push(pace);
  });

  return Object.entries(byCompetition)
    .map(([comp, data]) => ({
      competition: comp,
      totalRaces: data.totalRaces,
      avgPace: data.paces.reduce((a, b) => a + b, 0) / data.paces.length,
      totalDistance: data.totalDistance.toFixed(2),
    }))
    .map((item) => ({
      ...item,
      avgFormattedPace: formatPace(item.avgPace),
    }))
    .sort((a, b) => b.totalRaces - a.totalRaces);
};

/**
 * Calculate overall summary statistics
 */
export const calculateSummary = (races) => {
  if (races.length === 0) {
    return {
      totalRaces: 0,
      totalDistance: 0,
      avgPace: 0,
      bestPace: 0,
      lastRaceDate: null,
    };
  }

  let totalDistance = 0;
  let paces = [];
  let lastRaceDate = null;

  races.forEach((race) => {
    const dist = race.officialDistance || race.distance || 0;
    totalDistance += dist;
    const durationMinutes = (race.officialResultSeconds || 0) / 60;
    const pace = calculatePace(durationMinutes, dist);
    paces.push(pace);

    const raceDate = new Date(race.date);
    if (!lastRaceDate || raceDate > lastRaceDate) {
      lastRaceDate = raceDate;
    }
  });

  const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
  const bestPace = Math.min(...paces);

  return {
    totalRaces: races.length,
    totalDistance: totalDistance.toFixed(2),
    avgPace,
    avgFormattedPace: formatPace(avgPace),
    bestPace,
    bestFormattedPace: formatPace(bestPace),
    lastRaceDate: lastRaceDate?.toLocaleDateString(),
  };
};
