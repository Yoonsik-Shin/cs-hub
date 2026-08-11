import { useEffect } from 'react';

interface UseAutoRefreshOptions {
  intervalSeconds: number;
  paused: boolean;
  onRefresh: () => void | Promise<void>;
}

export function useAutoRefresh({
  intervalSeconds,
  paused,
  onRefresh,
}: UseAutoRefreshOptions): void {
  useEffect(() => {
    if (intervalSeconds <= 0 || paused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void onRefresh();
    }, intervalSeconds * 1000);

    return () => window.clearInterval(intervalId);
  }, [intervalSeconds, paused, onRefresh]);
}
