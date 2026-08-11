import { useMemo, useState } from 'react';
import { inquiryApi } from '../api/inquiryApi';
import type { CustomerInquiry, InquiryStatus, InquiryWorkLog, OperatorInfo } from '../types/inquiry';
import type { InquiryActionModalState } from '../components/InquiryActionModal';
import { getErrorMessage } from '../lib/errors';
import { isValidStatusReason, MIN_STATUS_REASON_LENGTH } from '../features/inquiry/policy';

interface UseInquiryActionsOptions {
  inquiry: CustomerInquiry;
  operator: OperatorInfo;
  workLogs: InquiryWorkLog[];
  onUpdateInquiry?: (id: string, updatedFields: Partial<CustomerInquiry>) => void;
  onToggleBookmark?: (id: string) => Promise<void> | void;
  refreshWorkLogs: () => Promise<void>;
}

export function useInquiryActions({
  inquiry,
  operator,
  workLogs,
  onUpdateInquiry,
  onToggleBookmark,
  refreshWorkLogs,
}: UseInquiryActionsOptions) {
  const [answerText, setAnswerText] = useState('');
  const [memoText, setMemoText] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);
  const [bookmarkChanging, setBookmarkChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [modal, setModal] = useState<InquiryActionModalState>({
    isOpen: false,
    type: 'STATUS_CHANGE',
  });

  const latestAnswerLog = useMemo(
    () => workLogs.find((log) => log.answer && log.answer.trim() !== ''),
    [workLogs],
  );

  const requestWorkLogRegistration = () => {
    if (!answerText.trim() && !memoText.trim()) {
      setError('답변 내용 또는 메모 내용을 입력해 주세요.');
      return;
    }
    setError(null);
    setModal({ isOpen: true, type: 'REGISTER_LOG', selectedStatus: inquiry.status });
  };

  const requestStatusChange = (targetStatus: InquiryStatus) => {
    if (targetStatus === inquiry.status) return;
    setError(null);
    setStatusChangeReason('');
    setModal({ isOpen: true, type: 'STATUS_CHANGE', targetStatus });
  };

  const requestBookmarkToggle = () => {
    if (!onToggleBookmark || bookmarkChanging) return;
    setError(null);
    setModal({ isOpen: true, type: 'BOOKMARK' });
  };

  const registerWorkLog = async () => {
    setSubmittingLog(true);
    setError(null);
    try {
      const targetStatus = modal.selectedStatus && modal.selectedStatus !== inquiry.status
        ? modal.selectedStatus
        : undefined;
      const statusReason = targetStatus
        ? (isValidStatusReason(memoText)
            ? memoText.trim()
            : isValidStatusReason(answerText)
              ? answerText.trim()
              : '답변/메모 등록에 따른 상태 변경')
        : undefined;

      await inquiryApi.createWorkLog(inquiry.id, {
        operatorInfo: operator,
        answer: answerText.trim() || undefined,
        memo: memoText.trim() || undefined,
        targetStatus,
        statusReason,
      });
      if (targetStatus) onUpdateInquiry?.(inquiry.id, { status: targetStatus });

      setAnswerText('');
      setMemoText('');
      setIsEditingAnswer(false);
      await refreshWorkLogs();
      setModal({ isOpen: false, type: 'REGISTER_LOG' });
    } catch (cause) {
      setError(`등록 중 문제가 발생했습니다: ${getErrorMessage(cause)}`);
    } finally {
      setSubmittingLog(false);
    }
  };

  const changeStatus = async () => {
    const targetStatus = modal.targetStatus;
    if (!targetStatus) return;
    if (!isValidStatusReason(statusChangeReason)) {
      setError(`상태 변경 사유는 최소 ${MIN_STATUS_REASON_LENGTH}자 이상이어야 합니다.`);
      return;
    }

    setStatusChanging(true);
    setError(null);
    try {
      await inquiryApi.updateInquiryStatus(inquiry.id, {
        operatorInfo: operator,
        status: targetStatus,
        reason: statusChangeReason.trim(),
      });
      await refreshWorkLogs();
      onUpdateInquiry?.(inquiry.id, { status: targetStatus });
      setModal({ isOpen: false, type: 'STATUS_CHANGE' });
      setStatusChangeReason('');
    } catch (cause) {
      setError(`상태 변경에 실패했습니다: ${getErrorMessage(cause)}`);
    } finally {
      setStatusChanging(false);
    }
  };

  const toggleBookmark = async () => {
    if (!onToggleBookmark || bookmarkChanging) return;
    setBookmarkChanging(true);
    setModal((previous) => ({ ...previous, isOpen: false }));
    try {
      await onToggleBookmark(inquiry.id);
      await refreshWorkLogs();
    } finally {
      setBookmarkChanging(false);
    }
  };

  const confirmModal = () => {
    if (modal.type === 'STATUS_CHANGE') return changeStatus();
    if (modal.type === 'BOOKMARK') return toggleBookmark();
    return registerWorkLog();
  };

  return {
    answerText,
    setAnswerText,
    memoText,
    setMemoText,
    isEditingAnswer,
    setIsEditingAnswer,
    latestAnswerLog,
    submittingLog,
    statusChanging,
    bookmarkChanging,
    modal,
    setModal,
    statusChangeReason,
    setStatusChangeReason,
    error,
    submitting: submittingLog || statusChanging || bookmarkChanging,
    requestWorkLogRegistration,
    requestStatusChange,
    requestBookmarkToggle,
    confirmModal,
  };
}
