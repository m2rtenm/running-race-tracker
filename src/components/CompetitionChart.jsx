import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from './StatCard';
import { calculateByCompetition } from '../utils/statsCalculations';

export default function CompetitionChart({ races }) {
  const competitionStats = calculateByCompetition(races || []);

  if (competitionStats.length === 0) {
    return (
      <StatCard title="Races by Competition" icon="🏅">
        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No race data available</p>
      </StatCard>
    );
  }

  // Transform data for chart (show top 10 competitions)
  const chartData = competitionStats.slice(0, 10).map((comp) => ({
    name: comp.competition.length > 15 ? comp.competition.substring(0, 12) + '...' : comp.competition,
    fullName: comp.competition,
    races: comp.totalRaces,
    avgPace: parseFloat(comp.avgPace.toFixed(2)),
    distance: parseFloat(comp.totalDistance),
  }));

  return (
    <StatCard title="Races by Competition (Top 10)" icon="🏅">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" label={{ value: 'Race Count', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg Pace (min/km)', angle: 90, position: 'insideRight' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}
            formatter={(value, name) => {
              if (name === 'avgPace') return [`${value.toFixed(2)} min/km`, 'Avg Pace'];
              return [value, name === 'races' ? 'Races' : 'Distance'];
            }}
            labelFormatter={(label) => `Comp: ${label}`}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="races" fill="#3b82f6" name="Race Count" />
          <Bar yAxisId="right" dataKey="avgPace" fill="#f59e0b" name="Avg Pace" />
        </BarChart>
      </ResponsiveContainer>

      {competitionStats.length > 10 && (
        <p style={{ marginTop: '12px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
          Showing top 10 of {competitionStats.length} competitions
        </p>
      )}
    </StatCard>
  );
}
