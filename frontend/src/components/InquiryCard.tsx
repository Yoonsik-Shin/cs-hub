import React from 'react';
import { BookOpen, Pencil, Circle, RotateCcw, Check, CalendarDays, Mail, Phone, Star } from 'lucide-react';
import type { CustomerInquiry } from '../types/inquiry';

interface InquiryCardProps {
  inquiry: CustomerInquiry;
  isSelected?: boolean;
  isBookmarked?: boolean;
  onClick?: () => void;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onCheckboxChange?: (id: string, checked: boolean) => void;
  index?: number;
}

export const InquiryCard: React.FC<InquiryCardProps> = ({ 
  inquiry, 
  isSelected, 
  isBookmarked = false, 
  onClick,
  showCheckbox = false,
  isChecked = false,
  onCheckboxChange,
  index
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getStatusInfo = (status: string): { label: string; icon: React.ReactNode } => {
    switch (status) {
      case 'OPEN':
        return { label: '미처리', icon: <Circle size={8} fill="currentColor" strokeWidth={0} /> };
      case 'IN_PROGRESS':
        return { label: '진행중', icon: <RotateCcw size={10} /> };
      case 'RESOLVED':
        return { label: '완료', icon: <Check size={10} strokeWidth={3} /> };
      default:
        return { label: status, icon: null };
    }
  };

  const getChannelInfo = (channel: string): { className: string; label: string; icon: React.ReactNode } => {
    const normalized = channel.toUpperCase();
    if (normalized.includes('NAVER_CAFE') || normalized.includes('CAFE')) {
      return { className: 'naver_cafe', label: '네이버카페', icon: <BookOpen size={10} /> };
    }
    if (normalized.includes('GOOGLE_SHEET') || normalized.includes('SHEET')) {
      return { className: 'google_sheet', label: '구글시트', icon: <BookOpen size={10} /> };
    }
    if (normalized.includes('EMAIL')) {
      return { className: 'email', label: '이메일', icon: <Mail size={10} /> };
    }
    if (normalized.includes('PHONE')) {
      return { className: 'phone', label: '전화접수', icon: <Phone size={10} /> };
    }
    return { className: 'manual', label: channel, icon: <Pencil size={10} /> };
  };

  const channelInfo = getChannelInfo(inquiry.channel);
  const statusInfo = getStatusInfo(inquiry.status);
  const statusClass = inquiry.status.toLowerCase();

  return (
    <div
      className={`inquiry-card ${statusClass}${isSelected ? ' selected' : ''}${isChecked ? ' has-checked' : ''}`}
      onClick={onClick}
      style={showCheckbox ? { display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'flex-start' } : undefined}
    >
      {(showCheckbox || isChecked) && (
        <div 
          className="card-checkbox-container"
          onClick={(e) => {
            e.stopPropagation();
            onCheckboxChange?.(inquiry.id, !isChecked);
          }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            alignSelf: 'stretch',
            flexShrink: 0 
          }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}} // handled by outer click handler
            className="card-checkbox"
            style={{ 
              width: '16px', 
              height: '16px', 
              cursor: 'pointer',
              accentColor: 'var(--accent-indigo)'
            }}
          />
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      {/* Row 1: Channel badge ← → Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flexWrap: 'wrap' }}>
          {index !== undefined && (
            <div className="inquiry-card-index-container">
              #{index}
            </div>
          )}
          <span className={`channel-badge ${channelInfo.className}`}>
            {channelInfo.icon}
            {channelInfo.label}
          </span>
          {inquiry.isManual && (
            <span 
              className="channel-badge manual" 
              style={{ 
                background: 'rgba(239, 68, 68, 0.12)', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                color: '#ef4444'
              }}
              title="수동으로 등록된 티켓입니다"
            >
              <Pencil size={10} />
              수동
            </span>
          )}
          {isBookmarked && (
            <span
              className="bookmark-badge"
              title="즐겨찾기한 문의입니다"
              aria-label="즐겨찾기"
            >
              <Star size={10} fill="currentColor" />
            </span>
          )}
          {inquiry.replyCount !== undefined && inquiry.replyCount > 0 && (
            <span
              className="thread-badge"
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: 'var(--accent-indigo)',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 5px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title={`회신 메일 ${inquiry.replyCount}개`}
            >
              💬 {inquiry.replyCount}
            </span>
          )}
        </div>
        <span className={`status-badge ${statusClass}`} style={{ flexShrink: 0 }}>
          {statusInfo.icon}
          {statusInfo.label}
        </span>
      </div>

      {/* Row 2: User code ← → Timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 }}>
        <span className="user-code" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {inquiry.userCode || '비회원 (익명)'}
        </span>
        <span className="inquiry-time" style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          <CalendarDays size={11} />
          {formatDate(inquiry.timestamp)}
        </span>
      </div>

      {/* Row 3: Content preview */}
      <div className="inquiry-content">
        {inquiry.content || '(내용 없음)'}
      </div>
      </div>
    </div>
  );
};
