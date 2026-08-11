import { ExternalLink, RefreshCw } from 'lucide-react';

export type NaverSessionStatus = 'ACTIVE' | 'EXPIRED' | 'MISSING' | 'CHECKING' | 'ERROR';

interface NaverSessionWidgetProps {
  status: NaverSessionStatus;
  updatedAt: string | null;
  collapsed: boolean;
  onValidate: () => void;
  onRenew: () => void;
}

const STATUS_PRESENTATION: Record<NaverSessionStatus, { badge: string; label: string; color: string }> = {
  ACTIVE: { badge: 'active', label: '세션 정상', color: '#16a34a' },
  EXPIRED: { badge: 'expired', label: '세션 만료됨', color: '#dc2626' },
  MISSING: { badge: 'missing', label: '세션 없음', color: '#d97706' },
  CHECKING: { badge: 'checking', label: '검사 중...', color: '#2563eb' },
  ERROR: { badge: 'missing', label: '검사 에러', color: '#dc2626' },
};

const formatCheckedAt = (isoString: string | null) => {
  if (!isoString) return '기록 없음';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '날짜 형식 오류';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export function NaverSessionWidget({
  status,
  updatedAt,
  collapsed,
  onValidate,
  onRenew,
}: NaverSessionWidgetProps) {
  const presentation = STATUS_PRESENTATION[status];

  if (collapsed) {
    return (
      <button
        type="button"
        className="collapsed-tooltip collapsed-session-dot"
        data-tooltip={`네이버 세션: ${presentation.label} - 클릭 시 실시간 검사`}
        aria-label={`네이버 세션 ${presentation.label}, 실시간 검사`}
        onClick={onValidate}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer', border: 0, background: 'transparent' }}
      >
        <span
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: presentation.color,
            boxShadow: `0 0 8px ${presentation.color}`,
          }}
        />
      </button>
    );
  }

  const needsRenewal = status === 'EXPIRED' || status === 'MISSING' || status === 'ERROR';

  return (
    <div className="naver-session-widget">
      <div className={`naver-session-status-icon ${presentation.badge}`} aria-hidden="true">
        <div className="naver-session-dot" />
      </div>

      <div className="naver-session-info">
        <span className="naver-session-label">네이버 카페 세션</span>
        <strong className="naver-session-status-text">{presentation.label}</strong>
        <span className="naver-session-time">최근 확인: {formatCheckedAt(updatedAt)}</span>
      </div>

      <div className="naver-session-actions">
        <button
          type="button"
          className="btn-session-action verify"
          onClick={onValidate}
          disabled={status === 'CHECKING'}
          title="네이버 세션을 실시간으로 직접 확인합니다"
          aria-label="네이버 세션 실시간 검사"
        >
          <RefreshCw size={12} className={status === 'CHECKING' ? 'spin' : ''} />
        </button>

        {needsRenewal && (
          <button
            type="button"
            className="btn-session-action renew"
            onClick={onRenew}
            title="네이버 세션을 새로 로그인하여 갱신합니다"
            aria-label="네이버 세션 갱신"
          >
            <ExternalLink size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
