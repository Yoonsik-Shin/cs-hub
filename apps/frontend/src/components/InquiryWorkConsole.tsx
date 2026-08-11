import { useState, type FormEvent } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, Clock, MessageSquare, Pin } from 'lucide-react';
import type { CustomerInquiry, InquiryStatus, InquiryWorkLog } from '../types/inquiry';
import { getStatusLabel, INQUIRY_STATUSES } from '../features/inquiry/policy';

interface InquiryWorkConsoleProps {
  inquiry: CustomerInquiry;
  answerText: string;
  memoText: string;
  latestAnswerLog?: InquiryWorkLog;
  editingAnswer: boolean;
  submittingLog: boolean;
  statusChanging: boolean;
  onAnswerTextChange: (value: string) => void;
  onMemoTextChange: (value: string) => void;
  onEditingAnswerChange: (editing: boolean) => void;
  onStatusChange: (status: InquiryStatus) => void;
  onSubmit: (event: FormEvent) => void;
}

const STATUS_CLASS: Record<InquiryStatus, string> = {
  OPEN: 'open',
  IN_PROGRESS: 'inprogress',
  RESOLVED: 'resolved',
};

const STATUS_COLOR: Record<InquiryStatus, string> = {
  OPEN: 'var(--status-open)',
  IN_PROGRESS: 'var(--status-inprogress)',
  RESOLVED: 'var(--status-resolved)',
};

export function InquiryWorkConsole({
  inquiry,
  answerText,
  memoText,
  latestAnswerLog,
  editingAnswer,
  submittingLog,
  statusChanging,
  onAnswerTextChange,
  onMemoTextChange,
  onEditingAnswerChange,
  onStatusChange,
  onSubmit,
}: InquiryWorkConsoleProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="cs-action-console cs-card" style={{ flexShrink: 0, background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)', overflow: 'hidden', overflowY: 'visible', display: 'flex', flexDirection: 'column', height: 'auto' }}>
      <button
        type="button"
        onClick={() => setCollapsed((previous) => !previous)}
        style={{ width: '100%', background: collapsed ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.02)', border: 'none', borderBottom: collapsed ? 'none' : '1px solid var(--border-light)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
          <CheckCircle size={16} style={{ color: 'var(--accent-indigo)' }} />
          실시간 티켓 처리 콘솔
        </span>
        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
          {collapsed ? '펼치기' : '접기'}
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 3.2fr', gap: '24px' }}>
          <div className="status-control-container" style={{ margin: 0, background: 'none', border: 'none', padding: '0 24px 0 0', display: 'flex', flexDirection: 'column', gap: '12px', borderRight: '1px solid var(--border-light)' }}>
            <span className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <Clock size={12} /> 티켓 상태 즉시 변경
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {INQUIRY_STATUSES.map((status) => {
                const active = inquiry.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    className={`btn-status-change ${STATUS_CLASS[status]}${active ? ' active' : ''}`}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      height: '36px',
                      borderRadius: '8px',
                      width: '100%',
                      textAlign: 'center',
                      background: active ? STATUS_COLOR[status] : '#ffffff',
                      border: `1px solid ${active ? STATUS_COLOR[status] : 'var(--border-light)'}`,
                      color: active ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: active ? 700 : undefined,
                    }}
                    disabled={statusChanging || active}
                    onClick={() => onStatusChange(status)}
                  >
                    {getStatusLabel(status)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="work-log-form-container" style={{ border: 'none', padding: 0, margin: 0 }}>
            <form className="work-log-form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor={`answer-${inquiry.id}`} className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                      <MessageSquare size={12} />
                      {latestAnswerLog && !editingAnswer ? '등록된 공식 답변' : '공식 답변 등록'}
                    </label>
                    {latestAnswerLog && (
                      <button
                        type="button"
                        onClick={() => {
                          onEditingAnswerChange(!editingAnswer);
                          onAnswerTextChange(editingAnswer ? '' : latestAnswerLog.answer || '');
                        }}
                        style={{ border: 'none', background: 'transparent', color: editingAnswer ? 'var(--text-muted)' : 'var(--accent-indigo)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: '2px 6px' }}
                      >
                        {editingAnswer ? '수정 취소' : '수정하기'}
                      </button>
                    )}
                  </div>
                  {latestAnswerLog && !editingAnswer ? (
                    <div style={{ minHeight: '100px', height: '100px', padding: '12px', fontSize: '12.5px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'rgba(99, 102, 241, 0.02)', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {latestAnswerLog.answer}
                    </div>
                  ) : (
                    <textarea id={`answer-${inquiry.id}`} className="form-textarea textarea-answer" placeholder="고객에게 전달될 공식 답변을 입력하세요..." value={answerText} onChange={(event) => onAnswerTextChange(event.target.value)} style={{ minHeight: '100px', height: '100px', padding: '12px', fontSize: '12.5px', borderRadius: '8px', resize: 'none' }} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor={`memo-${inquiry.id}`} className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', cursor: 'pointer' }}>
                    <Pin size={12} /> 관리자 비공개 메모
                  </label>
                  <textarea id={`memo-${inquiry.id}`} className="form-textarea textarea-memo" placeholder="관리자 전용 내부 비공개 메모를 입력하세요..." value={memoText} onChange={(event) => onMemoTextChange(event.target.value)} style={{ minHeight: '100px', height: '100px', padding: '12px', fontSize: '12.5px', borderRadius: '8px', resize: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" disabled={submittingLog} style={{ padding: '0 16px', fontSize: '12.5px', fontWeight: 600, borderRadius: '8px', height: '32px' }}>
                  {latestAnswerLog && !editingAnswer
                    ? submittingLog ? '메모 등록 중...' : '메모 등록'
                    : submittingLog ? '등록 중...' : '답변 및 메모 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
