import { X } from 'lucide-react';
import type { InquiryStatus } from '../types/inquiry';
import {
  getStatusLabel,
  isValidStatusReason,
  MIN_STATUS_REASON_LENGTH,
} from '../features/inquiry/policy';
import { ModalSurface } from './ui/ModalSurface';
import { InlineAlert } from './ui/InlineAlert';

export interface BatchStatusModalState {
  isOpen: boolean;
  targetStatus: InquiryStatus | null;
  isSubmitting: boolean;
  error: string | null;
  reason: string;
}

interface BatchStatusModalProps {
  modal: BatchStatusModalState;
  selectedCount: number;
  onChange: (modal: BatchStatusModalState) => void;
  onConfirm: () => void;
}

const CLOSED_MODAL: BatchStatusModalState = {
  isOpen: false,
  targetStatus: null,
  isSubmitting: false,
  error: null,
  reason: '',
};

export function BatchStatusModal({ modal, selectedCount, onChange, onConfirm }: BatchStatusModalProps) {
  if (!modal.isOpen) return null;

  const close = () => onChange(CLOSED_MODAL);
  const validReason = isValidStatusReason(modal.reason);

  return (
    <ModalSurface title="일괄 상태 변경" onClose={close} closeDisabled={modal.isSubmitting} contentStyle={{ maxWidth: '480px' }}>
      <div className="modal-header">
        <h3 className="modal-title">일괄 상태 변경</h3>
        <button type="button" className="close-btn" onClick={close} disabled={modal.isSubmitting} aria-label="일괄 상태 변경창 닫기"><X size={20} /></button>
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        선택한 <strong style={{ color: 'var(--accent-indigo)' }}>{selectedCount}개</strong> 문의를{' '}
        <strong>{modal.targetStatus ? getStatusLabel(modal.targetStatus) : ''}</strong> 상태로 변경하시겠습니까?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="batch-change-reason" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>일괄 변경 사유 (필수)</label>
          <span style={{ fontSize: '11px', color: validReason ? 'var(--accent-indigo)' : 'var(--text-muted)', fontWeight: 500 }}>
            ({modal.reason.trim().length} / 최소 {MIN_STATUS_REASON_LENGTH}자)
          </span>
        </div>
        <textarea
          id="batch-change-reason"
          className="form-textarea"
          placeholder={`일괄 상태를 변경하는 사유를 ${MIN_STATUS_REASON_LENGTH}자 이상 입력해 주세요.`}
          value={modal.reason}
          onChange={(event) => onChange({ ...modal, reason: event.target.value, error: null })}
          aria-invalid={Boolean(modal.error)}
          aria-describedby={modal.error ? 'batch-change-reason-error' : undefined}
          autoFocus
          style={{ minHeight: '80px', height: '80px', resize: 'none' }}
        />
      </div>
      {modal.error && <InlineAlert id="batch-change-reason-error">{modal.error}</InlineAlert>}
      <div className="modal-footer">
        <button type="button" className="btn-secondary" disabled={modal.isSubmitting} onClick={close}>취소</button>
        <button type="button" className="btn-primary" disabled={modal.isSubmitting || !validReason} onClick={onConfirm}>
          {modal.isSubmitting ? '변경 중...' : '확인'}
        </button>
      </div>
    </ModalSurface>
  );
}
