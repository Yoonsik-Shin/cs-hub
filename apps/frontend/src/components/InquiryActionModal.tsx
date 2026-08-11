import type { InquiryStatus } from '../types/inquiry';
import {
  getStatusLabel,
  INQUIRY_STATUSES,
  isValidStatusReason,
  MIN_STATUS_REASON_LENGTH,
} from '../features/inquiry/policy';
import { ModalSurface } from './ui/ModalSurface';
import { InlineAlert } from './ui/InlineAlert';

export interface InquiryActionModalState {
  isOpen: boolean;
  type: 'STATUS_CHANGE' | 'REGISTER_LOG' | 'BOOKMARK';
  targetStatus?: InquiryStatus;
  selectedStatus?: InquiryStatus;
}

interface InquiryActionModalProps {
  modal: InquiryActionModalState;
  currentStatus: InquiryStatus;
  isBookmarked: boolean;
  statusChangeReason: string;
  error: string | null;
  submitting: boolean;
  onModalChange: (modal: InquiryActionModalState) => void;
  onStatusChangeReason: (reason: string) => void;
  onConfirm: () => void;
}

export function InquiryActionModal({
  modal,
  currentStatus,
  isBookmarked,
  statusChangeReason,
  error,
  submitting,
  onModalChange,
  onStatusChangeReason,
  onConfirm,
}: InquiryActionModalProps) {
  if (!modal.isOpen) return null;

  const close = () => {
    if (!submitting) onModalChange({ ...modal, isOpen: false });
  };
  const requiresReason = modal.type === 'STATUS_CHANGE';
  const reasonIsValid = isValidStatusReason(statusChangeReason);
  const title = modal.type === 'STATUS_CHANGE'
    ? '티켓 상태 변경'
    : modal.type === 'BOOKMARK' ? '즐겨찾기 상태 변경' : '업무 답변 및 메모 등록';

  return (
    <ModalSurface title={title} onClose={close} closeDisabled={submitting} contentStyle={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="close-btn" onClick={close} disabled={submitting} aria-label="작업 확인창 닫기">✕</button>
        </div>

        {modal.type === 'STATUS_CHANGE' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              티켓 상태를 <strong>[{modal.targetStatus ? getStatusLabel(modal.targetStatus) : ''}]</strong> 상태로 변경하시겠습니까?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="status-change-reason" className="detail-title" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                  상태 변경 사유 (필수)
                </label>
                <span style={{ fontSize: '11px', color: reasonIsValid ? 'var(--accent-indigo)' : 'var(--text-muted)', fontWeight: 500 }}>
                  ({statusChangeReason.trim().length} / 최소 {MIN_STATUS_REASON_LENGTH}자)
                </span>
              </div>
              <textarea
                id="status-change-reason"
                className="form-textarea"
                placeholder={`상태를 변경하는 사유를 ${MIN_STATUS_REASON_LENGTH}자 이상 입력해 주세요.`}
                value={statusChangeReason}
                onChange={(event) => onStatusChangeReason(event.target.value)}
                style={{ minHeight: '80px', height: '80px', padding: '10px 12px', fontSize: '12.5px', borderRadius: '8px', resize: 'none', border: '1px solid var(--border-light)', background: '#ffffff' }}
                required
              />
            </div>
          </div>
        ) : modal.type === 'BOOKMARK' ? (
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            이 문의를 즐겨찾기 <strong>{isBookmarked ? '[해제]' : '[등록]'}</strong> 하시겠습니까?
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              작성하신 공식 답변과 내부 메모를 등록하시겠습니까?
            </p>
            <div className="form-group">
              <label htmlFor="status-select-modal">등록과 동시에 티켓 상태를 변경하시겠습니까?</label>
              <select
                id="status-select-modal"
                className="select-input"
                value={modal.selectedStatus}
                onChange={(event) => onModalChange({ ...modal, selectedStatus: event.target.value as InquiryStatus })}
              >
                <option value={currentStatus}>상태 유지 (현재: {getStatusLabel(currentStatus)})</option>
                {INQUIRY_STATUSES.filter((status) => status !== currentStatus).map((status) => (
                  <option key={status} value={status}>{getStatusLabel(status)} ({status}) 상태로 변경</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && <InlineAlert>{error}</InlineAlert>}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={close} disabled={submitting}>취소</button>
          <button
            type="button"
            className="btn-primary"
            disabled={submitting || (requiresReason && !reasonIsValid)}
            onClick={onConfirm}
          >
            {submitting ? '처리 중...' : (modal.type === 'REGISTER_LOG' ? '등록' : '확인')}
          </button>
        </div>
    </ModalSurface>
  );
}
