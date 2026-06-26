import React from 'react';
import { MessageSquare, BookOpen, Pencil, Circle, RotateCcw, Check, CalendarDays, Mail } from 'lucide-react';
import type { CustomerInquiry } from '../types/inquiry';

interface InquiryCardProps {
  inquiry: CustomerInquiry;
  isSelected?: boolean;
  onClick?: () => void;
}

export const InquiryCard: React.FC<InquiryCardProps> = ({ inquiry, isSelected, onClick }) => {
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
    if (normalized.includes('KAKAO')) {
      return { className: 'kakao', label: '카카오', icon: <MessageSquare size={10} /> };
    }
    if (normalized.includes('NAVER_CAFE') || normalized.includes('CAFE')) {
      return { className: 'naver_cafe', label: '네이버카페', icon: <BookOpen size={10} /> };
    }
    if (normalized.includes('GOOGLE_SHEET') || normalized.includes('SHEET')) {
      return { className: 'manual', label: '구글시트', icon: <BookOpen size={10} /> };
    }
    if (normalized.includes('EMAIL')) {
      return { className: 'email', label: '이메일', icon: <Mail size={10} /> };
    }
    if (normalized.includes('MANUAL')) {
      return { className: 'manual', label: '수동생성', icon: <Pencil size={10} /> };
    }
    return { className: 'manual', label: channel, icon: <Pencil size={10} /> };
  };

  const channelInfo = getChannelInfo(inquiry.channel);
  const statusInfo = getStatusInfo(inquiry.status);
  const statusClass = inquiry.status.toLowerCase();

  return (
    <div
      className={`inquiry-card ${statusClass}${isSelected ? ' selected' : ''}`}
      onClick={onClick}
    >
      {/* Row 1: Channel badge ← → Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span className={`channel-badge ${channelInfo.className}`}>
          {channelInfo.icon}
          {channelInfo.label}
        </span>
        <span className={`status-badge ${statusClass}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </span>
      </div>

      {/* Row 2: User code ← → Timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
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
  );
};

