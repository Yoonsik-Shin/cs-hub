import { useCallback, useEffect, useState } from 'react';
import { inquiryApi } from '../api/inquiryApi';
import type { NaverSessionStatus } from '../components/NaverSessionWidget';

interface UseNaverSessionOptions {
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useNaverSession({ notify }: UseNaverSessionOptions) {
  const [status, setStatus] = useState<NaverSessionStatus>('CHECKING');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const result = await inquiryApi.getNaverSessionStatus();
      setStatus(result.status);
      setUpdatedAt(result.updatedAt);
    } catch (cause) {
      console.error('Failed to fetch Naver session status:', cause);
      setStatus('ERROR');
    }
  }, []);

  const validate = async () => {
    if (verifying) return;
    setVerifying(true);
    setStatus('CHECKING');
    try {
      const result = await inquiryApi.syncNaverSessionStatus();
      setStatus(result.status);
      setUpdatedAt(result.updatedAt);
      if (result.valid) {
        notify('네이버 카페 세션이 정상입니다.', 'success');
      } else {
        setRenewModalOpen(true);
      }
    } catch (cause) {
      console.error('Failed to sync Naver session:', cause);
      notify('네이버 카페 세션을 확인하지 못했습니다. 브라우저 워커 연결 상태를 확인해 주세요.', 'error');
      setStatus('ERROR');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(refreshStatus);
  }, [refreshStatus]);

  return {
    status,
    updatedAt,
    verifying,
    renewModalOpen,
    setRenewModalOpen,
    refreshStatus,
    validate,
  };
}
