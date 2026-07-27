import { useState, useMemo } from 'react';
import StatCard from './StatCard';
import PRsCard from './PRsCard';
import PaceChart from './PaceChart';
import YearlyCard from './YearlyCard';
import ConsistencyHeatmap from './ConsistencyHeatmap';
import CompetitionChart from './CompetitionChart';
import { calculateSummary } from '../utils/statsCalculations';

export default function StatsOverview({ races = [] }) {
  const [activeTab, setActiveTab] = useState('summary');

  const summary = useMemo(() => calculateSummary(races), [races]);

  const tabs = [
    { id: 'summary', label: '📊 Summary', icon: '📊' },
    { id: 'prs', label: '🏆 PRs', icon: '🏆' },
    { id: 'pace', label: '📈 Pace', icon: '📈' },
    { id: 'yearly', label: '📅 Yearly', icon: '📅' },
    { id: 'consistency', label: '🔥 Consistency', icon: '🔥' },
    { id: 'competitions', label: '🏅 Competitions', icon: '🏅' },
  ];

  return (
    <div style={{ marginTop: '32px' }}>
      <h2 style={{ marginBottom: '20px', color: '#1f2937' }}>Statistics & Analytics</h2>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              backgroundColor: activeTab === tab.id ? '#10b981' : '#e5e7eb',
              color: activeTab === tab.id ? 'white' : '#1f2937',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard title="Total Races" icon="🏃">
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
              {summary.totalRaces}
            </p>
          </StatCard>
          <StatCard title="Total Distance" icon="📏">
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
              {summary.totalDistance}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#999' }}>km</p>
          </StatCard>
          <StatCard title="Average Pace" icon="⏱️">
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
              {summary.avgFormattedPace}
            </p>
          </StatCard>
          <StatCard title="Best Pace" icon="⚡">
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#059669' }}>
              {summary.bestFormattedPace}
            </p>
          </StatCard>
          <StatCard title="Last Race" icon="📅">
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              {summary.lastRaceDate || 'N/A'}
            </p>
          </StatCard>
        </div>
      )}

      {/* PRs Tab */}
      {activeTab === 'prs' && <PRsCard races={races} />}

      {/* Pace Tab */}
      {activeTab === 'pace' && <PaceChart races={races} />}

      {/* Yearly Tab */}
      {activeTab === 'yearly' && <YearlyCard races={races} />}

      {/* Consistency Tab */}
      {activeTab === 'consistency' && <ConsistencyHeatmap races={races} />}

      {/* Competitions Tab */}
      {activeTab === 'competitions' && <CompetitionChart races={races} />}
    </div>
  );
}
