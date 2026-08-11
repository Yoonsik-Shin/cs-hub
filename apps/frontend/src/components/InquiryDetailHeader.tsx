import { Calendar } from 'lucide-react';
import type { CustomerInquiry, InquiryStatus } from '../types/inquiry';
import { formatInquiryDate, getChannelPresentation, getStatusLabel } from '../features/inquiry/policy';

const STATUS_BACKGROUND: Record<InquiryStatus, string> = {
  OPEN: 'var(--status-open)',
  IN_PROGRESS: 'var(--status-inprogress)',
  RESOLVED: 'var(--status-resolved)',
};

export function InquiryDetailHeader({ inquiry }: { inquiry: CustomerInquiry }) {
  const channel = getChannelPresentation(inquiry.channel);

  return (
    <header
      className="detail-pane-header"
      style={{
        background: STATUS_BACKGROUND[inquiry.status],
        color: '#ffffff',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div className="detail-modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span className={`channel-badge ${channel.className}`} style={{ border: '1px solid rgba(255, 255, 255, 0.3)', color: '#ffffff', background: 'rgba(255, 255, 255, 0.15)' }}>
          {channel.label}
        </span>
        {inquiry.isManual && <span className="channel-badge manual">수동 등록</span>}
        <span className="detail-modal-title" style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700 }}>
          {inquiry.userCode || '비회원 (익명)'} 님의 문의 상세
        </span>
        <span className="inquiry-time" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={12} /> {formatInquiryDate(inquiry.timestamp)}
        </span>
        <span className={`status-badge ${inquiry.status.toLowerCase()}`} style={{ border: '1px solid rgba(255, 255, 255, 0.4)', color: '#ffffff', background: 'rgba(255, 255, 255, 0.1)' }}>
          {getStatusLabel(inquiry.status)}
        </span>
      </div>
    </header>
  );
}
