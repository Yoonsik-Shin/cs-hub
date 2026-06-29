import React from 'react';
import { Inbox, AlertCircle } from 'lucide-react';

interface SingleCardProps {
  count: number;
  hasMore?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}

export const UnprocessedStatsCard: React.FC<SingleCardProps> = ({
  count,
  hasMore = false,
  isCollapsed,
  onClick,
}) => {
  const display = hasMore ? `${count}+` : String(count);
  const tooltipCount = hasMore ? `${count}건 이상` : `${count}건`;

  if (isCollapsed) {
    return (
      <button
        type="button"
        className="collapsed-tooltip collapsed-stat violet"
        data-tooltip={`미처리 CS ${tooltipCount} - 클릭하여 조회`}
        onClick={onClick}
        aria-label={`미처리 CS ${tooltipCount} 조회`}
        style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}
      >
        {display}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="stats-card glass-card violet glow-violet-hover"
      onClick={onClick}
      aria-label={`미처리 CS ${tooltipCount} 조회`}
      style={{ width: '100%', cursor: 'grab' }}
    >
      <div className="stats-icon-wrapper">
        <AlertCircle size={20} />
      </div>
      <div className="stats-info">
        <span className="stats-label">미처리 CS</span>
        <span className="stats-value">{display}</span>
      </div>
    </button>
  );
};

export const TodayStatsCard: React.FC<SingleCardProps> = ({
  count,
  hasMore = false,
  isCollapsed,
  onClick,
}) => {
  const display = hasMore ? `${count}+` : String(count);
  const tooltipCount = hasMore ? `${count}건 이상` : `${count}건`;

  if (isCollapsed) {
    return (
      <button
        type="button"
        className="collapsed-tooltip collapsed-stat cyan"
        data-tooltip={`오늘 신규 미처리 CS ${tooltipCount} - 클릭하여 조회`}
        onClick={onClick}
        aria-label={`오늘 신규 미처리 CS ${tooltipCount} 조회`}
        style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}
      >
        {display}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="stats-card glass-card cyan glow-cyan-hover"
      onClick={onClick}
      aria-label={`오늘 신규 미처리 CS ${tooltipCount} 조회`}
      style={{ width: '100%', cursor: 'grab' }}
    >
      <div className="stats-icon-wrapper">
        <Inbox size={20} />
      </div>
      <div className="stats-info">
        <span className="stats-label">오늘 신규 CS</span>
        <span className="stats-value">{display}</span>
      </div>
    </button>
  );
};
