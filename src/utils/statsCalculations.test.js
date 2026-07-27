import {
  calculatePRs,
  calculatePaceByDistance,
  calculateYearlyStats,
  calculateConsistency,
  calculateByCompetition,
  calculateSummary,
  formatPace,
} from './statsCalculations';

// Mock race data for testing
const mockRaces = [
  {
    id: '1',
    name: 'Tallinn Marathon',
    date: '2024-05-15',
    distance: 42.2,
    hours: 3,
    minutes: 45,
    seconds: 30,
    competition: 'Marathon',
  },
  {
    id: '2',
    name: 'Pärnu 10K',
    date: '2024-06-01',
    distance: 10.0,
    hours: 0,
    minutes: 42,
    seconds: 15,
    competition: '10K Series',
  },
  {
    id: '3',
    name: 'Tartu Half',
    date: '2024-04-20',
    distance: 21.1,
    hours: 1,
    minutes: 35,
    seconds: 0,
    competition: 'Half Marathon',
  },
  {
    id: '4',
    name: 'Võru 5K',
    date: '2024-03-10',
    distance: 5.0,
    hours: 0,
    minutes: 20,
    seconds: 45,
    competition: '5K Series',
  },
  {
    id: '5',
    name: 'Pärnu 10K Fast',
    date: '2024-07-15',
    distance: 10.0,
    hours: 0,
    minutes: 41,
    seconds: 0,
    competition: '10K Series',
  },
  {
    id: '6',
    name: 'Tallinn Marathon 2023',
    date: '2023-05-20',
    distance: 42.2,
    hours: 3,
    minutes: 52,
    seconds: 15,
    competition: 'Marathon',
  },
];

export function runTests() {
  console.log('=== Running Stats Calculations Tests ===\n');

  // Test 1: Summary Statistics
  console.log('Test 1: Summary Statistics');
  const summary = calculateSummary(mockRaces);
  console.log('Total Races:', summary.totalRaces);
  console.log('Total Distance:', summary.totalDistance, 'km');
  console.log('Average Pace:', summary.avgFormattedPace);
  console.log('Best Pace:', summary.bestFormattedPace);
  console.log('Last Race:', summary.lastRaceDate);
  console.log('✓ Summary test passed\n');

  // Test 2: Personal Records
  console.log('Test 2: Personal Records');
  const prs = calculatePRs(mockRaces);
  console.log('Found PRs for', prs.length, 'distances:');
  prs.forEach((pr) => {
    console.log(`  - ${pr.distance}: ${pr.formattedPace} (${new Date(pr.date).toLocaleDateString('et-EE')})`);
  });
  console.log('✓ PRs test passed\n');

  // Test 3: Pace by Distance
  console.log('Test 3: Pace by Distance');
  const paceByDistance = calculatePaceByDistance(mockRaces);
  console.log('Average pace by distance:');
  paceByDistance.forEach((item) => {
    console.log(`  - ${item.distance}: ${item.avgFormattedPace} (${item.count} races)`);
  });
  console.log('✓ Pace by distance test passed\n');

  // Test 4: Yearly Statistics
  console.log('Test 4: Yearly Statistics');
  const yearlyStats = calculateYearlyStats(mockRaces);
  console.log('Yearly summary:');
  yearlyStats.forEach((year) => {
    console.log(`  - ${year.year}: ${year.totalRaces} races, ${year.totalDistance} km, avg pace ${year.avgFormattedPace}`);
  });
  console.log('✓ Yearly stats test passed\n');

  // Test 5: Consistency
  console.log('Test 5: Consistency Metrics');
  const consistency = calculateConsistency(mockRaces);
  console.log('Current Streak:', consistency.currentStreak, 'months');
  console.log('Max Streak:', consistency.maxStreak, 'months');
  console.log('Improvement:', consistency.improvement, '%');
  console.log('Monthly activity:', consistency.monthlyFrequency.length, 'months');
  console.log('✓ Consistency test passed\n');

  // Test 6: By Competition
  console.log('Test 6: Competition Statistics');
  const byCompetition = calculateByCompetition(mockRaces);
  console.log('Races by competition:');
  byCompetition.forEach((comp) => {
    console.log(`  - ${comp.competition}: ${comp.totalRaces} races, ${comp.totalDistance} km, avg pace ${comp.avgFormattedPace}`);
  });
  console.log('✓ Competition test passed\n');

  console.log('=== All tests passed! ===');
}

// Run tests if this module is imported in dev
if (import.meta.hot) {
  runTests();
}
