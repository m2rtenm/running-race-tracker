import StatCard from './StatCard';
import { calculateYearlyStats } from '../utils/statsCalculations';

export default function YearlyCard({ races }) {
  const yearlyStats = calculateYearlyStats(races || []);

  if (yearlyStats.length === 0) {
    return (
      <StatCard title="Yearly Summary" icon="📅">
        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No race data available</p>
      </StatCard>
    );
  }

  return (
    <StatCard title="Yearly Summary" icon="📅">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {yearlyStats.map((year) => (
          <div
            key={year.year}
            style={{
              padding: '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', color: '#1f2937' }}>{year.year}</h4>
            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Races:</strong> {year.totalRaces}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Distance:</strong> {year.totalDistance} km
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Avg Pace:</strong> <span style={{ color: '#10b981' }}>{year.avgFormattedPace}</span>
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Best:</strong> <span style={{ color: '#059669' }}>{year.bestFormattedPace}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </StatCard>
  );
}
