import { useCallback, useEffect, useState } from 'react';
import { inquiryApi } from '../api/inquiryApi';
import type { CustomerInquiry, InquiryWorkLog } from '../types/inquiry';

interface UseInquiryActivityOptions {
  inquiryId: string;
  onInquiryRefresh?: (updated: CustomerInquiry) => void;
  onRequireNaverSessionRenew?: () => void;
}

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : String(error)
);

const isNaverSessionError = (message: string) => [
  '410',
  '401',
  'GONE',
  'Unauthorized',
  'Session has expired',
  '로그인하지 않았습니다',
].some((marker) => message.includes(marker));

export function useInquiryActivity({
  inquiryId,
  onInquiryRefresh,
  onRequireNaverSessionRenew,
}: UseInquiryActivityOptions) {
  const [workLogs, setWorkLogs] = useState<InquiryWorkLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  const [replies, setReplies] = useState<CustomerInquiry[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogError(null);
    try {
      setWorkLogs(await inquiryApi.getWorkLogs(inquiryId));
    } catch (error) {
      console.error(error);
      setLogError('업무 처리 이력을 불러오는 데 실패했습니다.');
    } finally {
      setLoadingLogs(false);
    }
  }, [inquiryId]);

  const fetchReplies = useCallback(async () => {
    setLoadingReplies(true);
    try {
      setReplies(await inquiryApi.getReplies(inquiryId));
    } catch (error) {
      console.error('Failed to fetch replies:', error);
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
        setLogError('업무 처리 이력을 불러오는 데 실패했습니다.');
      }

      if (repliesResult.status === 'fulfilled') {
        setReplies(repliesResult.value);
      } else {
        console.error('Failed to fetch replies:', repliesResult.reason);
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
      if (isNaverSessionError(message)) {
        if (onRequireNaverSessionRenew) {
          onRequireNaverSessionRenew();
        } else {
          alert('네이버 세션이 만료되었습니다. 상단 메뉴나 로그인 페이지에서 세션을 갱신해 주세요.');
        }
      } else {
        alert('데이터 갱신에 실패했습니다: ' + message);
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchReplies, fetchWorkLogs, inquiryId, onInquiryRefresh, onRequireNaverSessionRenew]);

  return {
    workLogs,
    loadingLogs,
    logError,
    setLogError,
    replies,
    loadingReplies,
    refreshing,
    fetchWorkLogs,
    refreshInquiry,
  };
}
