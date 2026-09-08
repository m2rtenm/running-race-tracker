import { getDistanceBucket } from '../utils/statsCalculations';

function paceSeconds(race) {
  const distance = Number(race.officialDistance);
  const result = Number(race.officialResultSeconds);
  return distance > 0 && result > 0 ? result / distance : null;
}

function formatPace(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')} /km`;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function getWarnings(race) {
  const officialDistance = Number(race.officialDistance);
  const actualDistance = Number(race.actualDistance);
  const pace = paceSeconds(race);
  const warnings = [];

  if (!officialDistance || !actualDistance || !Number(race.officialResultSeconds)) {
    warnings.push('Missing distance or result');
  } else if (Math.abs(actualDistance - officialDistance) / officialDistance > 0.05) {
    warnings.push('Actual distance differs by over 5%');
  }
  if (pace && (pace < 120 || pace > 900)) {
    warnings.push('Pace is outside the expected range');
  }
  return warnings;
}

export default function RaceInsights({ races }) {
  const groups = new Map();
  const issues = [];

  for (const race of races) {
    const pace = paceSeconds(race);
    const bucket = getDistanceBucket(Number(race.officialDistance));
    if (pace) {
      const entries = groups.get(bucket) || [];
      entries.push({ ...race, pace });
      groups.set(bucket, entries);
    }

    const warnings = getWarnings(race);
    if (warnings.length) issues.push({ race, warnings });
  }

  const comparisons = [...groups.entries()]
    .map(([bucket, entries]) => {
      const byDate = [...entries].sort((a, b) => a.date.localeCompare(b.date));
      const latest = byDate.at(-1);
      const previous = byDate.at(-2);
      const fastest = Math.min(...entries.map((race) => race.pace));
      return {
        bucket,
        count: entries.length,
        fastest,
        median: median(entries.map((race) => race.pace)),
        latest,
        change: previous ? latest.pace - previous.pace : null,
      };
    })
    .sort((a, b) => a.fastest - b.fastest);

  const mostRaced = comparisons.reduce((most, item) => !most || item.count > most.count ? item : most, null);
  const latestRace = [...races].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <>
      <section className="insights-section">
        <h2>Distance comparisons</h2>
        {comparisons.length === 0 ? (
          <p className="empty">Add valid race results to compare performance by distance.</p>
        ) : (
          <div className="table-scroll">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Distance</th>
                  <th>Races</th>
                  <th>Fastest pace</th>
                  <th>Median pace</th>
                  <th>Latest vs previous</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((item) => (
                  <tr key={item.bucket}>
                    <td>{item.bucket}</td>
                    <td>{item.count}</td>
                    <td>{formatPace(item.fastest)}</td>
                    <td>{formatPace(item.median)}</td>
                    <td>{item.change === null ? 'Need 2 races' : `${item.change <= 0 ? 'Faster' : 'Slower'} by ${formatPace(Math.abs(item.change)).replace(' /km', '')}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="insights-section">
        <h2>Personal insights</h2>
        <div className="insight-grid">
          <article><strong>Most raced distance</strong><span>{mostRaced ? `${mostRaced.bucket} (${mostRaced.count})` : '—'}</span></article>
          <article><strong>Latest recorded race</strong><span>{latestRace ? `${latestRace.competitionName} · ${latestRace.date}` : '—'}</span></article>
          <article><strong>Fastest pace overall</strong><span>{comparisons[0] ? `${formatPace(comparisons[0].fastest)} · ${comparisons[0].bucket}` : '—'}</span></article>
        </div>
      </section>

      {issues.length > 0 && (
        <section className="quality-section">
          <h2>Data quality checks</h2>
          <p>Review these records before relying on their comparisons.</p>
          <ul>
            {issues.map(({ race, warnings }) => (
              <li key={race.id}>{race.competitionName} ({race.date}): {warnings.join('; ')}.</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
