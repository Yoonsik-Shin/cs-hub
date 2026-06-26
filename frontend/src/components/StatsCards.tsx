import React from 'react';
import { Inbox, AlertCircle } from 'lucide-react';

interface StatsCardsProps {
  unprocessedCount: number;
  todayCount: number;
  unprocessedHasMore?: boolean;
  todayHasMore?: boolean;
  isCollapsed?: boolean;
  onUnprocessedClick?: () => void;
  onTodayClick?: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  unprocessedCount,
  todayCount,
  unprocessedHasMore = false,
  todayHasMore = false,
  isCollapsed,
  onUnprocessedClick,
  onTodayClick,
}) => {
  const unprocessedDisplay = unprocessedHasMore ? `${unprocessedCount}+` : String(unprocessedCount);
  const todayDisplay = todayHasMore ? `${todayCount}+` : String(todayCount);
  const unprocessedTooltipCount = unprocessedHasMore ? `${unprocessedCount}건 이상` : `${unprocessedCount}건`;
  const todayTooltipCount = todayHasMore ? `${todayCount}건 이상` : `${todayCount}건`;

  if (isCollapsed) {
    return (
      <div className="collapsed-stats-stack">
        {/* Unprocessed CS Card (Collapsed) */}
        <button
          type="button"
          className="collapsed-tooltip collapsed-stat violet"
          data-tooltip={`미처리 CS ${unprocessedTooltipCount} - 클릭하여 조회`}
          onClick={onUnprocessedClick}
          aria-label={`미처리 CS ${unprocessedTooltipCount} 조회`}
        >
          {unprocessedDisplay}
        </button>

        {/* New CS Card (Collapsed) */}
        <button
          type="button"
          className="collapsed-tooltip collapsed-stat cyan"
          data-tooltip={`오늘 신규 미처리 CS ${todayTooltipCount} - 클릭하여 조회`}
          onClick={onTodayClick}
          aria-label={`오늘 신규 미처리 CS ${todayTooltipCount} 조회`}
        >
          {todayDisplay}
        </button>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <div className="stats-left-group">
        {/* Unprocessed CS Card */}
        <button
          type="button"
          className="stats-card glass-card violet glow-violet-hover"
          onClick={onUnprocessedClick}
          aria-label={`미처리 CS ${unprocessedTooltipCount} 조회`}
        >
          <div className="stats-icon-wrapper">
            <AlertCircle size={20} />
          </div>
          <div className="stats-info">
            <span className="stats-label">미처리 CS</span>
            <span className="stats-value">{unprocessedDisplay}</span>
          </div>
        </button>

        {/* New CS Card */}
        <button
          type="button"
          className="stats-card glass-card cyan glow-cyan-hover"
          onClick={onTodayClick}
          aria-label={`오늘 신규 미처리 CS ${todayTooltipCount} 조회`}
        >
          <div className="stats-icon-wrapper">
            <Inbox size={20} />
          </div>
          <div className="stats-info">
            <span className="stats-label">오늘 신규 CS</span>
            <span className="stats-value">{todayDisplay}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
