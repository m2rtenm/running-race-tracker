import StatCard from './StatCard';
import { calculateConsistency } from '../utils/statsCalculations';

export default function ConsistencyHeatmap({ races }) {
  const { monthlyFrequency, currentStreak, maxStreak, improvement } = calculateConsistency(races || []);

  if (monthlyFrequency.length === 0) {
    return (
      <StatCard title="Consistency & Streaks" icon="🔥">
        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No race data available</p>
      </StatCard>
    );
  }

  // Get max frequency for color intensity
  const maxFrequency = Math.max(...monthlyFrequency.map((m) => m.count));

  // Function to get color based on frequency
  const getColor = (count) => {
    const intensity = count / maxFrequency;
    if (intensity === 0) return '#f3f4f6';
    if (intensity < 0.33) return '#d1fae5';
    if (intensity < 0.66) return '#6ee7b7';
    return '#10b981';
  };

  return (
    <StatCard title="Consistency & Streaks" icon="🔥">
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ margin: '0', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
              Current Streak
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
              {currentStreak}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999' }}>months</p>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#fdf2f8', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ margin: '0', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
              Best Streak
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#ec4899' }}>
              {maxStreak}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999' }}>months</p>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ margin: '0', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
              Improvement
            </p>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '24px',
                fontWeight: 'bold',
                color: improvement >= 0 ? '#10b981' : '#ef4444',
              }}
            >
              {improvement >= 0 ? '+' : ''}{improvement}%
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999' }}>month/month</p>
          </div>
        </div>

        <h4 style={{ margin: '16px 0 8px 0', color: '#333', fontSize: '14px' }}>Monthly Activity</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(30px, 1fr))', gap: '4px' }}>
          {monthlyFrequency.map((month) => {
            const [year, monthNum] = month.month.split('-');
            const monthName = new Date(year, monthNum - 1).toLocaleDateString('et-EE', { month: 'short' });

            return (
              <div
                key={month.month}
                style={{
                  padding: '8px',
                  backgroundColor: getColor(month.count),
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: month.count > 0 ? '#fff' : '#999',
                  transition: 'all 0.2s ease',
                  title: `${month.month}: ${month.count} race${month.count !== 1 ? 's' : ''}`,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                {month.count}
              </div>
            );
          })}
        </div>
        <p style={{ margin: '12px 0 0 0', fontSize: '11px', color: '#999' }}>
          Legend: darker = more races that month
        </p>
      </div>
    </StatCard>
  );
}
