import StatCard from './StatCard';
import { calculatePRs, formatPace } from '../utils/statsCalculations';

export default function PRsCard({ races }) {
  const prs = calculatePRs(races || []);

  if (prs.length === 0) {
    return (
      <StatCard title="Personal Records" icon="🏆">
        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No races recorded yet</p>
      </StatCard>
    );
  }

  return (
    <StatCard title="Personal Records by Distance" icon="🏆">
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid #10b981' }}>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                Distance
              </th>
              <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#333' }}>
                Pace
              </th>
              <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#333' }}>
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {prs.map((pr, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: idx % 2 === 0 ? '#f9fafb' : 'white',
                }}
              >
                <td style={{ padding: '8px', textAlign: 'left' }}>{pr.distance}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>
                  {pr.formattedPace}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>
                  {(() => { const d = new Date(`${pr.date}T00:00:00`); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StatCard>
  );
}
