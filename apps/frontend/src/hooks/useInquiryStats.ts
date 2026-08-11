import { useCallback, useEffect, useState } from 'react';
import { inquiryApi } from '../api/inquiryApi';

export function useInquiryStats() {
  const [unprocessedCount, setUnprocessedCount] = useState(0);
  const [unprocessedHasMore, setUnprocessedHasMore] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [todayHasMore, setTodayHasMore] = useState(false);
  const [missingUserCodeCount, setMissingUserCodeCount] = useState(0);
  const [missingUserCodeHasMore, setMissingUserCodeHasMore] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [open, todayOpen, missingUserCode] = await Promise.all([
        inquiryApi.countInquiries({ status: 'OPEN', limit: 100 }),
        inquiryApi.countInquiries({ status: 'OPEN', start: today.toISOString(), limit: 100 }),
        inquiryApi.countInquiries({ userCodeMissing: true, limit: 100 }),
      ]);
      setUnprocessedCount(open.count);
      setUnprocessedHasMore(open.hasMore);
      setTodayCount(todayOpen.count);
      setTodayHasMore(todayOpen.hasMore);
      setMissingUserCodeCount(missingUserCode.count);
      setMissingUserCodeHasMore(missingUserCode.hasMore);
    } catch (cause) {
      console.error('Failed to fetch stats:', cause);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(refresh);
  }, [refresh]);

  return {
    unprocessedCount,
    unprocessedHasMore,
    todayCount,
    todayHasMore,
    missingUserCodeCount,
    missingUserCodeHasMore,
    refresh,
  };
}
