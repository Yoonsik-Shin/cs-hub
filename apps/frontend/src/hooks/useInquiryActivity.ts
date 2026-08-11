import { useCallback, useEffect, useState } from 'react';
import { inquiryApi } from '../api/inquiryApi';
import type { CustomerInquiry, InquiryWorkLog } from '../types/inquiry';
import { useFeedback } from '../components/ui/feedbackContext';
import { HttpError } from '../api/httpClient';
import { getErrorMessage } from '../lib/errors';

interface UseInquiryActivityOptions {
  inquiryId: string;
  onInquiryRefresh?: (updated: CustomerInquiry) => void;
  onRequireNaverSessionRenew?: () => void;
}

const isNaverSessionError = (error: unknown) => (
  error instanceof HttpError && (error.status === 401 || error.status === 410)
);

export function useInquiryActivity({
  inquiryId,
  onInquiryRefresh,
  onRequireNaverSessionRenew,
}: UseInquiryActivityOptions) {
  const { notify } = useFeedback();
  const [workLogs, setWorkLogs] = useState<InquiryWorkLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [workLogError, setWorkLogError] = useState<string | null>(null);
  const [replies, setReplies] = useState<CustomerInquiry[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [repliesError, setRepliesError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkLogs = useCallback(async () => {
    setLoadingLogs(true);
    setWorkLogError(null);
    try {
      setWorkLogs(await inquiryApi.getWorkLogs(inquiryId));
    } catch (error) {
      console.error(error);
      setWorkLogError('업무 처리 이력을 불러오는 데 실패했습니다.');
    } finally {
      setLoadingLogs(false);
    }
  }, [inquiryId]);

  const fetchReplies = useCallback(async () => {
    setLoadingReplies(true);
    setRepliesError(null);
    try {
      setReplies(await inquiryApi.getReplies(inquiryId));
    } catch (error) {
      console.error('Failed to fetch replies:', error);
      setRepliesError('고객 회신을 불러오는 데 실패했습니다.');
    } finally {
      setLoadingReplies(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      inquiryApi.getWorkLogs(inquiryId),
      inquiryApi.getReplies(inquiryId),
    ]).then(([logsResult, repliesResult]) => {
      if (cancelled) return;

      if (logsResult.status === 'fulfilled') {
        setWorkLogs(logsResult.value);
      } else {
        console.error(logsResult.reason);
        setWorkLogError('업무 처리 이력을 불러오는 데 실패했습니다.');
      }

      if (repliesResult.status === 'fulfilled') {
        setReplies(repliesResult.value);
      } else {
        console.error('Failed to fetch replies:', repliesResult.reason);
        setRepliesError('고객 회신을 불러오는 데 실패했습니다.');
      }

      setLoadingLogs(false);
      setLoadingReplies(false);
    });

    return () => {
      cancelled = true;
    };
  }, [inquiryId]);

  const refreshInquiry = useCallback(async () => {
    setRefreshing(true);
    try {
      const updated = await inquiryApi.refreshInquiry(inquiryId);
      onInquiryRefresh?.(updated);
      await Promise.all([fetchReplies(), fetchWorkLogs()]);
    } catch (error) {
      console.error('Failed to refresh inquiry:', error);
      const message = getErrorMessage(error);
      if (isNaverSessionError(error)) {
        if (onRequireNaverSessionRenew) {
          onRequireNaverSessionRenew();
        } else {
          notify('네이버 세션이 만료되었습니다. 상단 메뉴나 로그인 페이지에서 세션을 갱신해 주세요.', 'error');
        }
      } else {
        notify('데이터 갱신에 실패했습니다: ' + message, 'error');
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchReplies, fetchWorkLogs, inquiryId, notify, onInquiryRefresh, onRequireNaverSessionRenew]);

  return {
    workLogs,
    loadingLogs,
    activityError: [workLogError, repliesError].filter(Boolean).join(' ') || null,
    replies,
    loadingReplies,
    refreshing,
    fetchWorkLogs,
    refreshInquiry,
  };
}
