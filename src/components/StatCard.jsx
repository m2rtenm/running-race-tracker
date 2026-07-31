import { Activity, CalendarRange, TimerReset, Route } from 'lucide-react';

const icons = {
  races: Activity,
  distance: Route,
  best: TimerReset,
  years: CalendarRange,
};

function StatCard({ label, value, kind, title, icon, children }) {
  // Container mode: used by StatsOverview sub-components
  if (children !== undefined) {
    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
        }}
      >
        {(title || icon) && (
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon && <span>{icon}</span>}
            {title}
          </h3>
        )}
        {children}
      </div>
    );
  }

  // Value mode: used by the main Dashboard stat cards
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
