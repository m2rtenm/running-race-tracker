import { Activity, CalendarRange, TimerReset, Route } from 'lucide-react';

const icons = {
  races: Activity,
  distance: Route,
  best: TimerReset,
  years: CalendarRange,
};

function StatCard({ label, value, kind }) {
  const Icon = icons[kind] || Activity;

  return (
    <article className="stat-card">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <div>
        <h3>{label}</h3>
        <p>{value}</p>
      </div>
    </article>
  );
}

export default StatCard;
