import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours > 0) parts.push(String(hours).padStart(2, '0'));
  parts.push(String(minutes).padStart(2, '0'));
  parts.push(String(seconds).padStart(2, '0'));
  return parts.join(':');
}

function PerformanceChart({ races }) {
  const chartData = [...races]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((race) => ({
      label: race.competitionName,
      date: race.date,
      result: race.officialResultSeconds,
      resultLabel: formatSeconds(race.officialResultSeconds),
      distance: Number(race.officialDistance).toFixed(1),
    }));

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>Performance over time</h3>
          <p>Track how your official race results trend across entries.</p>
        </div>
      </div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => formatSeconds(value)} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => formatSeconds(value)}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line type="monotone" dataKey="result" stroke="#3d8bff" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PerformanceChart;
