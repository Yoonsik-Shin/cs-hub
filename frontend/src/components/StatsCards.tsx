import React from 'react';
import { Inbox, AlertCircle } from 'lucide-react';

interface StatsCardsProps {
  unprocessedCount: number;
  todayCount: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ unprocessedCount, todayCount }) => {
  return (
    <div className="stats-container">
      <div className="stats-left-group">
        {/* Unprocessed CS Card */}
        <div className="stats-card glass-card violet glow-violet-hover">
          <div className="stats-icon-wrapper">
            <AlertCircle size={24} />
          </div>
          <div className="stats-info">
            <span className="stats-label">미처리 CS수</span>
            <span className="stats-value">{unprocessedCount}</span>
          </div>
        </div>

        {/* New CS Card */}
        <div className="stats-card glass-card cyan glow-cyan-hover">
          <div className="stats-icon-wrapper">
            <Inbox size={24} />
          </div>
          <div className="stats-info">
            <span className="stats-label">오늘 새로 들어온 CS 수</span>
            <span className="stats-value">{todayCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
