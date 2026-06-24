import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Cpu, Info, Calendar, Clock, User, ArrowRight, ArrowLeft, History,
  FileText, CheckCircle
} from 'lucide-react';
import type { CustomerInquiry, InquiryWorkLog } from '../types/inquiry';
import { inquiryApi } from '../api/inquiryApi';

interface InquiryCardProps {
  inquiry: CustomerInquiry;
  onRefresh?: () => void;
  onUpdateInquiry?: (id: string, updatedFields: Partial<CustomerInquiry>) => void;
}

export const InquiryCard: React.FC<InquiryCardProps> = ({ inquiry, onUpdateInquiry }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [workLogs, setWorkLogs] = useState<InquiryWorkLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Resizable columns states
  const [midWidth, setMidWidth] = useState(55); // Column 1 (Ticket Reference) %
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
    const startX = mouseDownEvent.clientX;
    const startMidWidth = midWidth;
    const containerWidth = document.querySelector('.detail-modal-body')?.clientWidth || 1000;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const deltaX = mouseMoveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      const newMidWidth = Math.max(30, Math.min(70, startMidWidth + deltaPercent));
      setMidWidth(newMidWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Form states
  const [answerText, setAnswerText] = useState('');
  const [memoText, setMemoText] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  // Custom Modal state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'STATUS_CHANGE' | 'REGISTER_LOG';
    targetStatus?: string;
    selectedStatus?: string;
  }>({
    isOpen: false,
    type: 'STATUS_CHANGE',
  });

  // Mock Admin Operator Info
  const mockOperator = {
    id: 'admin_01',
    nickname: '김관리자',
    email: 'admin@ttam.com'
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  // Helper to get status text in Korean
  const getStatusKorean = (status: string) => {
    switch (status) {
      case 'OPEN':
        return '미처리';
      case 'IN_PROGRESS':
        return '진행중';
      case 'RESOLVED':
        return '완료';
      default:
        return status;
    }
  };

  const getActionKorean = (actionType: string) => {
    switch (actionType) {
      case 'ANSWER_SUBMITTED':
        return '답변 등록';
      case 'MEMO_ADDED':
        return '메모 등록';
      case 'ANSWER_AND_MEMO_SUBMITTED':
        return '답변 및 메모 등록';
      case 'STATUS_CHANGED':
        return '상태 변경';
      default:
        return actionType;
    }
  };

  const getActionClass = (actionType: string) => {
    switch (actionType) {
      case 'ANSWER_SUBMITTED':
      case 'ANSWER_AND_MEMO_SUBMITTED':
        return 'answer';
      case 'MEMO_ADDED':
        return 'memo';
      case 'STATUS_CHANGED':
        return 'status-change';
      default:
        return '';
    }
  };

  // Helper to get channel badge styling and clean text
  const getChannelInfo = (channel: string) => {
    const normalized = channel.toUpperCase();
    if (normalized.includes('KAKAO')) {
      return { className: 'kakao', label: '카카오톡' };
    }
    if (normalized.includes('NAVER_CAFE') || normalized.includes('CAFE')) {
      return { className: 'naver_cafe', label: '네이버 카페' };
    }
    if (normalized.includes('MANUAL')) {
      return { className: 'manual', label: '수동 생성' };
    }
    return { className: 'manual', label: channel };
  };

  const fetchWorkLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogError(null);
    try {
      const logs = await inquiryApi.getWorkLogs(inquiry.id);
      setWorkLogs(logs);
    } catch (e: any) {
      console.error(e);
      setLogError('업무 처리 이력을 불러오는 데 실패했습니다.');
    } finally {
      setLoadingLogs(false);
    }
  }, [inquiry.id]);

  // Load logs on detailed view modal open and manage scroll lock
  useEffect(() => {
    if (isDetailOpen) {
      fetchWorkLogs();
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isDetailOpen, fetchWorkLogs]);

  // Trigger Register Work Log custom confirmation modal
  const handleRegisterWorkLogClick = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!answerText.trim() && !memoText.trim()) {
      setLogError('답변 내용 또는 메모 내용을 입력해 주세요.');
      return;
    }
    setLogError(null);
    setModal({
      isOpen: true,
      type: 'REGISTER_LOG',
      selectedStatus: inquiry.status // Default to current status
    });
  };

  // Trigger Status Change custom confirmation modal
  const handleStatusChangeClick = (newStatus: string) => {
    if (newStatus === inquiry.status) return;
    setLogError(null);
    setModal({
      isOpen: true,
      type: 'STATUS_CHANGE',
      targetStatus: newStatus
    });
  };

  // Execute Work Log Registration (with optional concurrent status change)
  const executeRegisterWorkLog = async () => {
    setSubmittingLog(true);
    setLogError(null);
    try {
      // 1. Register answer/memo
      await inquiryApi.createWorkLog(inquiry.id, {
        operatorInfo: mockOperator,
        answer: answerText.trim() || undefined,
        memo: memoText.trim() || undefined
      });
      console.log('✅ work log created successfully');

      // 2. Perform status change if requested
      if (modal.selectedStatus && modal.selectedStatus !== inquiry.status) {
        console.log('🚀 Calling status update along with log registration:', modal.selectedStatus);
        await inquiryApi.updateInquiryStatus(inquiry.id, {
          operatorInfo: mockOperator,
          status: modal.selectedStatus
        });
        if (onUpdateInquiry) {
          onUpdateInquiry(inquiry.id, { status: modal.selectedStatus as any });
        }
      }

      setAnswerText('');
      setMemoText('');
      await fetchWorkLogs();
      setModal({ isOpen: false, type: 'REGISTER_LOG' });
    } catch (err: any) {
      console.error('❌ Failed to register work log:', err);
      setLogError('등록 중 문제가 발생했습니다: ' + err.message);
    } finally {
      setSubmittingLog(false);
    }
  };

  // Execute Status Change API
  const executeStatusChange = async () => {
    const targetStatus = modal.targetStatus;
    if (!targetStatus) return;

    setStatusChanging(true);
    setLogError(null);
    try {
      console.log('🚀 Calling updateInquiryStatus API for id:', inquiry.id, 'status:', targetStatus);
      await inquiryApi.updateInquiryStatus(inquiry.id, {
        operatorInfo: mockOperator,
        status: targetStatus
      });
      console.log('✅ updateInquiryStatus API success');
      await fetchWorkLogs();
      if (onUpdateInquiry) {
        onUpdateInquiry(inquiry.id, { status: targetStatus as any });
      }
      setModal({ isOpen: false, type: 'STATUS_CHANGE' });
    } catch (err: any) {
      console.error('❌ Failed to update status:', err);
      setLogError('상태 변경에 실패했습니다: ' + err.message);
    } finally {
      setStatusChanging(false);
    }
  };

  const channelInfo = getChannelInfo(inquiry.channel);

  return (
    <div 
      className={`inquiry-card glass-card ${inquiry.status.toLowerCase()}`}
      onClick={() => setIsDetailOpen(true)}
    >
      <div className="inquiry-card-header">
        <div className="inquiry-meta">
          <span className={`channel-badge ${channelInfo.className}`}>
            {channelInfo.label}
          </span>
          <span className="user-code">
            {inquiry.userCode || '비회원 (익명)'}
          </span>
          <span className="inquiry-time">
            <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {formatDate(inquiry.timestamp)}
          </span>
        </div>
        
        <div className="inquiry-right" onClick={(e) => e.stopPropagation()}>
          <span className={`status-badge ${inquiry.status.toLowerCase()}`}>
            {getStatusKorean(inquiry.status)}
          </span>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
            <ArrowRight size={16} />
          </span>
        </div>
      </div>

      <div className="inquiry-content" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {inquiry.content || '(내용 없음)'}
      </div>

      {/* Full-screen Detailed View Modal Portal */}
      {isDetailOpen && createPortal(
        <div 
          className="detail-modal-overlay" 
          onClick={(e) => {
            e.stopPropagation();
            setIsDetailOpen(false);
          }}
        >
          <div 
            className="detail-modal-content" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="detail-modal-header">
              <div className="detail-modal-header-left">
                <button 
                  type="button" 
                  className="detail-modal-back-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailOpen(false);
                  }}
                >
                  <ArrowLeft size={16} />
                  목록으로 돌아가기
                </button>
                <span className={`channel-badge ${channelInfo.className}`}>
                  {channelInfo.label}
                </span>
                <span className="detail-modal-title">
                  {inquiry.userCode || '1211 2312 3319'} 님의 문의 상세
                </span>
                <span className="inquiry-time" style={{ fontSize: '13px' }}>
                  <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {formatDate(inquiry.timestamp)}
                </span>
                <span className={`status-badge ${inquiry.status.toLowerCase()}`}>
                  {getStatusKorean(inquiry.status)}
                </span>
              </div>
              <button 
                type="button" 
                className="close-btn" 
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color var(--transition-fast)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDetailOpen(false);
                }}
              >
                ✕
              </button>
            </div>

            {/* Split Modal Body */}
            <div className="detail-modal-body">
              {/* Middle Pane: CS Inquiry Ticket Reference */}
              <div className="detail-modal-mid-pane" style={{ width: `${midWidth}%` }} onClick={(e) => e.stopPropagation()}>
                
                {/* 1. Static Reference Section (문의 참조 정보) */}
                <div className="cs-reference-panel">
                  <div className="cs-panel-section-title">
                    <FileText size={16} />
                    문의 참조 정보 (Ticket Reference)
                  </div>

                  {/* Inquiry Content Box inside Modal */}
                  <div className={`detail-query-box ${inquiry.status.toLowerCase()}`}>
                    <div className="detail-query-box-title">고객 접수 내용</div>
                    <div className="detail-query-text">
                      {inquiry.content || '(내용 없음)'}
                    </div>
                  </div>

                  {/* Channel Metadata & Device Info Side-by-side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="detail-section">
                      <span className="detail-title">
                        <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        채널 메타데이터
                      </span>
                      <div className="detail-box">
                        {inquiry.channelMetadata ? (
                          <pre>{JSON.stringify(inquiry.channelMetadata, null, 2)}</pre>
                        ) : (
                          '메타데이터 없음'
                        )}
                      </div>
                    </div>
                    <div className="detail-section">
                      <span className="detail-title">
                        <Cpu size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        디바이스 정보
                      </span>
                      <div className="detail-box">
                        {inquiry.deviceInfo ? (
                          <pre>{JSON.stringify(inquiry.deviceInfo, null, 2)}</pre>
                        ) : (
                          '디바이스 정보 없음'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timeline / Action History */}
                  <div className="detail-section" onClick={(e) => e.stopPropagation()}>
                    <span className="detail-title">
                      <History size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      업무 처리 이력
                    </span>
                    {loadingLogs ? (
                      <div style={{ padding: '12px 0' }}>
                        <div className="skeleton skeleton-text short" />
                        <div className="skeleton skeleton-text" />
                      </div>
                    ) : logError ? (
                      <div style={{ color: '#f87171', fontSize: '13px', padding: '8px 0' }}>⚠️ {logError}</div>
                    ) : workLogs.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>
                        등록된 업무 처리 이력이 없습니다.
                      </div>
                    ) : (
                      <div className="timeline-scroll-area">
                        <div className="timeline-container">
                          {workLogs.map((log) => (
                            <div key={log.id} className="timeline-item">
                              <div className="timeline-dot" />
                              <div className="timeline-content">
                                <div className="timeline-header">
                                  <span className={`timeline-action ${getActionClass(log.actionType)}`}>
                                    {getActionKorean(log.actionType)}
                                  </span>
                                  <span className="timeline-operator">
                                    <User size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                                    {log.operatorInfo.nickname}
                                  </span>
                                  <span className="timeline-date">{formatDate(log.createdAt)}</span>
                                </div>
                                {log.actionType === 'STATUS_CHANGED' && log.previousStatus !== log.currentStatus && (
                                  <div className="timeline-status-change">
                                    {getStatusKorean(log.previousStatus || '')} 
                                    <ArrowRight size={10} style={{ margin: '0 4px' }} /> 
                                    <strong>{getStatusKorean(log.currentStatus || '')}</strong>
                                  </div>
                                )}
                                {log.answer && (
                                  <div className="timeline-detail-box answer">
                                    {log.answer}
                                  </div>
                                )}
                                {log.memo && (
                                  <div className="timeline-detail-box memo">
                                    {log.memo}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resize Divider */}
              <div 
                className={`resize-divider ${isResizing ? 'active' : ''}`}
                onMouseDown={startResizing}
              />

              {/* Right Pane: CS Inquiry Ticket Processing Action Console */}
              <div className="detail-modal-right-pane" style={{ width: `${100 - midWidth}%` }} onClick={(e) => e.stopPropagation()}>
                {/* 2. Action Console Section (실시간 티켓 처리 콘솔) */}
                <div className="cs-action-console">
                  <div className="cs-panel-section-title" style={{ borderBottomColor: 'rgba(99, 102, 241, 0.15)', margin: 0, paddingBottom: '6px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--accent-indigo)' }} />
                    실시간 티켓 처리 콘솔 (Support Actions)
                  </div>

                  {/* Manual Status Control */}
                  <div className="status-control-container" style={{ margin: 0, border: 'none', background: 'rgba(255, 255, 255, 0.5)' }} onClick={(e) => e.stopPropagation()}>
                    <span className="status-control-title">
                      <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      티켓 상태 즉시 변경
                    </span>
                    <div className="status-control-buttons">
                      <button
                        type="button"
                        className={`btn-status-change open`}
                        disabled={statusChanging || inquiry.status === 'OPEN'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChangeClick('OPEN');
                        }}
                      >
                        미처리
                      </button>
                      <button
                        type="button"
                        className={`btn-status-change inprogress`}
                        disabled={statusChanging || inquiry.status === 'IN_PROGRESS'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChangeClick('IN_PROGRESS');
                        }}
                      >
                        진행중
                      </button>
                      <button
                        type="button"
                        className={`btn-status-change resolved`}
                        disabled={statusChanging || inquiry.status === 'RESOLVED'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChangeClick('RESOLVED');
                        }}
                      >
                        완료
                      </button>
                    </div>
                  </div>

                  {/* Answer & Memo Input Form */}
                  <div className="work-log-form-container" style={{ border: 'none', padding: 0, margin: 0 }} onClick={(e) => e.stopPropagation()}>
                    <form className="work-log-form" onSubmit={handleRegisterWorkLogClick}>
                      <div className="form-group">
                        <label htmlFor={`answer-${inquiry.id}`} style={{ color: 'var(--text-primary)' }}>공식 답변 등록</label>
                        <textarea
                          id={`answer-${inquiry.id}`}
                          className="form-textarea"
                          placeholder="고객에게 전달될 공식 답변을 입력하세요..."
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`memo-${inquiry.id}`} style={{ color: 'var(--text-primary)' }}>관리자 비공개 메모</label>
                        <textarea
                          id={`memo-${inquiry.id}`}
                          className="form-textarea"
                          placeholder="관리자 전용 내부 비공개 메모를 입력하세요..."
                          value={memoText}
                          onChange={(e) => setMemoText(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={submittingLog}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          {submittingLog ? '등록 중...' : '답변 및 메모 등록'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Confirmation / Action Modal */}
      {modal.isOpen && createPortal(
        <div 
          className="modal-overlay" 
          onClick={(e) => {
            e.stopPropagation();
            setModal({ ...modal, isOpen: false });
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modal.type === 'STATUS_CHANGE' ? '티켓 상태 변경' : '업무 답변 및 메모 등록'}
              </h3>
              <button 
                type="button" 
                className="close-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  setModal({ ...modal, isOpen: false });
                }}
              >
                ✕
              </button>
            </div>

            {modal.type === 'STATUS_CHANGE' ? (
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                티켓 상태를 <strong>[{getStatusKorean(modal.targetStatus || '')}]</strong> 상태로 변경하시겠습니까?
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  작성하신 공식 답변과 내부 메모를 등록하시겠습니까?
                </p>
                <div className="form-group" onClick={(e) => e.stopPropagation()}>
                  <label htmlFor="status-select-modal">등록과 동시에 티켓 상태를 변경하시겠습니까?</label>
                  <select 
                    id="status-select-modal"
                    className="select-input"
                    value={modal.selectedStatus}
                    onChange={(e) => setModal({ ...modal, selectedStatus: e.target.value })}
                  >
                    <option value={inquiry.status}>상태 유지 (현재: {getStatusKorean(inquiry.status)})</option>
                    {inquiry.status !== 'OPEN' && <option value="OPEN">미처리 (OPEN) 상태로 변경</option>}
                    {inquiry.status !== 'IN_PROGRESS' && <option value="IN_PROGRESS">진행중 (IN_PROGRESS) 상태로 변경</option>}
                    {inquiry.status !== 'RESOLVED' && <option value="RESOLVED">완료 (RESOLVED) 상태로 변경</option>}
                  </select>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={(e) => {
                  e.stopPropagation();
                  setModal({ ...modal, isOpen: false });
                }}
              >
                취소
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                disabled={submittingLog || statusChanging}
                onClick={(e) => {
                  e.stopPropagation();
                  if (modal.type === 'STATUS_CHANGE') {
                    executeStatusChange();
                  } else {
                    executeRegisterWorkLog();
                  }
                }}
              >
                {submittingLog || statusChanging ? '처리 중...' : (modal.type === 'STATUS_CHANGE' ? '확인' : '등록')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
