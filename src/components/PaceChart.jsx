import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from './StatCard';

export default function PaceChart({ races }) {
  if (!races || races.length === 0) {
    return (
      <StatCard title="Pace Trend" icon="📈">
        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No race data available</p>
      </StatCard>
    );
  }

  // Create data points for each race ordered by date
  const data = [...races]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((race) => {
      const dist = race.officialDistance || race.distance || 0;
      const durationMinutes = (race.officialResultSeconds || 0) / 60;
      const pace = dist > 0 ? durationMinutes / dist : 0;
      return {
        date: new Date(race.date).toLocaleDateString('et-EE', { month: 'short', day: 'numeric' }),
        pace: parseFloat(pace.toFixed(2)),
        raceName: race.competitionName || race.name,
        distance: dist,
      };
    });

  return (
    <StatCard title="Pace Trend Over Time" icon="📈">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            label={{ value: 'Pace (min/km)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}
            formatter={(value) => [`${value.toFixed(2)} min/km`, 'Pace']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="pace"
            stroke="#10b981"
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Pace (min/km)"
          />
        </LineChart>
      </ResponsiveContainer>
    </StatCard>
  );
}
