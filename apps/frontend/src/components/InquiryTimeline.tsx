import { useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Edit,
  Inbox,
  Mail,
  MessageSquare,
  Pin,
  RefreshCw,
  Star,
  User,
} from 'lucide-react';
import type { TimelineItem } from '../features/inquiry/timeline';
import { formatInquiryDate, getStatusLabel } from '../features/inquiry/policy';
import { InlineAlert } from './ui/InlineAlert';

interface InquiryTimelineProps {
  items: readonly TimelineItem[];
  loadingLogs: boolean;
  loadingReplies: boolean;
  error: string | null;
  activeImageUrl: string | null;
  getImageUrl: (url: string) => string;
  onSelectImage: (url: string | null) => void;
}

export function InquiryTimeline({
  items,
  loadingLogs,
  loadingReplies,
  error,
  activeImageUrl,
  getImageUrl,
  onSelectImage,
}: InquiryTimelineProps) {
  const timelineEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      timelineEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [items]);

  if (loadingLogs) {
    return (
      <div style={{ padding: '12px 0', flex: 1 }}>
        <div className="skeleton skeleton-text short" />
        <div className="skeleton skeleton-text" />
      </div>
    );
  }

  if (loadingReplies) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0', flex: 1 }}>회신 내역을 불러오는 중...</div>;
  }

  return (
    <div className="timeline-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0 12px' }}>
      {error && <InlineAlert>{error}</InlineAlert>}
      <div className="timeline-container">
        {items.map((item) => {
          const actionClass = getActionClass(item.actionType);
          return (
            <div key={item.id} className={`timeline-item ${actionClass}`}>
              <div className={`timeline-dot ${actionClass}`}>
                {item.actionType === 'INITIAL_SUBMISSION' && <Inbox size={10} />}
                {item.actionType === 'PENDING_ACTION' && <AlertCircle size={10} />}
                {item.actionType === 'STATUS_CHANGED' && <RefreshCw size={10} />}
                {(item.actionType === 'ANSWER_SUBMITTED' || item.actionType === 'ANSWER_AND_MEMO_SUBMITTED') && <MessageSquare size={10} />}
                {item.actionType === 'MEMO_ADDED' && <Pin size={10} />}
                {item.actionType === 'FIELD_MODIFIED' && <Edit size={10} />}
                {item.actionType === 'CUSTOMER_REPLY' && <Mail size={10} />}
                {(item.actionType === 'BOOKMARK_ADDED' || item.actionType === 'BOOKMARK_REMOVED') && (
                  <Star size={10} fill={item.actionType === 'BOOKMARK_ADDED' ? 'currentColor' : 'none'} />
                )}
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className={`timeline-action ${actionClass}`}>{getActionKorean(item.actionType)}</span>
                  <span className="timeline-operator">
                    <User size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                    {item.operatorInfo.nickname}
                  </span>
                  {item.actionType !== 'PENDING_ACTION' && (
                  <span className="timeline-date">{formatInquiryDate(item.createdAt)}</span>
                  )}
                </div>
                {item.actionType === 'STATUS_CHANGED' && item.previousStatus !== item.currentStatus && (
                  <div className="timeline-status-change">
                    {getStatusLabel(item.previousStatus || '')}
                    <ArrowRight size={10} style={{ margin: '0 4px' }} />
                    <strong>{getStatusLabel(item.currentStatus || '')}</strong>
                  </div>
                )}
                <TimelineItemDetails
                  item={item}
                  activeImageUrl={activeImageUrl}
                  getImageUrl={getImageUrl}
                  onSelectImage={onSelectImage}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div ref={timelineEndRef} />
    </div>
  );
}

interface TimelineItemDetailsProps {
  item: TimelineItem;
  activeImageUrl: string | null;
  getImageUrl: (url: string) => string;
  onSelectImage: (url: string | null) => void;
}

function TimelineItemDetails({ item, activeImageUrl, getImageUrl, onSelectImage }: TimelineItemDetailsProps) {
  if (item.actionType === 'PENDING_ACTION' || item.actionType === 'INITIAL_SUBMISSION') {
    return <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px', lineHeight: '1.4' }}>{item.memo}</div>;
  }

  if (item.actionType === 'FIELD_MODIFIED') {
    return (
      <div className="timeline-modification-container" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {item.ipAddress && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>요청 IP: {item.ipAddress}</div>}
        {item.modificationDetails?.map((mod, index) => (
          <div key={index} className="timeline-detail-box modify" style={{ padding: '8px 12px', background: 'rgba(124, 58, 237, 0.03)', borderRadius: '6px', fontSize: '12px' }}>
            <div style={{ fontWeight: '700', color: 'var(--accent-violet)', marginBottom: '6px' }}>{getFieldLabel(mod.field)} 수정</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ textDecoration: 'line-through', opacity: 0.6, color: 'var(--text-secondary)' }}>{mod.beforeValue || '(없음)'}</span>
              <ArrowRight size={12} style={{ color: 'var(--accent-violet)' }} />
              <strong style={{ color: 'var(--text-primary)' }}>{mod.afterValue || '(없음)'}</strong>
            </div>
            {mod.reason && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>사유: {mod.reason}</div>}
          </div>
        ))}
      </div>
    );
  }

  if (item.actionType === 'CUSTOMER_REPLY') {
    return (
      <div className="timeline-detail-box customer-reply" style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '6px', lineHeight: '1.4' }}>
        <div style={{ whiteSpace: 'pre-wrap' }}>{item.memo}</div>
        {item.imageUrls && item.imageUrls.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            {item.imageUrls.map((url, index) => (
              <a
                key={url}
                href={getImageUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
                    event.preventDefault();
                    onSelectImage(activeImageUrl === url ? null : url);
                  }
                }}
              >
                <img
                  src={getImageUrl(url)}
                  referrerPolicy="no-referrer"
                  alt={`reply-img-${index}`}
                  style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-light)', cursor: 'pointer' }}
                />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {item.answer && <div className="timeline-detail-box answer">{item.answer}</div>}
      {item.memo && <div className="timeline-detail-box memo">{item.memo}</div>}
    </>
  );
}

function getActionKorean(actionType: string): string {
  const labels: Record<string, string> = {
    ANSWER_SUBMITTED: '답변 등록',
    MEMO_ADDED: '메모 등록',
    ANSWER_AND_MEMO_SUBMITTED: '답변 및 메모 등록',
    STATUS_CHANGED: '상태 변경',
    INITIAL_SUBMISSION: '최초 접수',
    PENDING_ACTION: '처리 대기',
    FIELD_MODIFIED: '정보 수정',
    BOOKMARK_ADDED: '즐겨찾기 등록',
    BOOKMARK_REMOVED: '즐겨찾기 해제',
    CUSTOMER_REPLY: '고객 회신',
  };
  return labels[actionType] || actionType;
}

function getActionClass(actionType: string): string {
  if (actionType === 'ANSWER_SUBMITTED' || actionType === 'ANSWER_AND_MEMO_SUBMITTED') return 'answer';
  if (actionType === 'MEMO_ADDED') return 'memo';
  if (actionType === 'STATUS_CHANGED') return 'status-change';
  if (actionType === 'INITIAL_SUBMISSION') return 'initial';
  if (actionType === 'PENDING_ACTION') return 'pending';
  if (actionType === 'FIELD_MODIFIED') return 'modify';
  if (actionType === 'BOOKMARK_ADDED' || actionType === 'BOOKMARK_REMOVED') return 'bookmark-action';
  if (actionType === 'CUSTOMER_REPLY') return 'customer-reply';
  return '';
}

function getFieldLabel(field: string): string {
  if (field === 'channel') return '채널';
  if (field === 'userCode') return '유저 코드';
  if (field === 'deviceInfo') return '디바이스 정보';
  if (field === 'content') return '문의 내용';
  return field;
}
