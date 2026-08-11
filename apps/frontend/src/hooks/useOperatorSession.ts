import { useEffect, useRef, useState } from 'react';
import { inquiryApi } from '../api/inquiryApi';
import type { OperatorInfo } from '../types/inquiry';
import type { ConfirmOptions } from '../components/ui/feedbackContext';

interface UseOperatorSessionOptions {
  requestConfirmation: (options: ConfirmOptions) => Promise<boolean>;
}

const FALLBACK_OPERATOR: OperatorInfo = {
  id: 'unknown',
  nickname: '알 수 없음',
  email: '',
  role: 'OPERATOR',
};

export function useOperatorSession({ requestConfirmation }: UseOperatorSessionOptions) {
  const [operator, setOperator] = useState<OperatorInfo | null>(null);
  const adminAccessIssuedOriginRef = useRef<string | null>(null);

  useEffect(() => {
    inquiryApi.getMe()
      .then((currentOperator) => {
        setOperator(currentOperator);
        if (currentOperator.role !== 'ADMIN' || adminAccessIssuedOriginRef.current === window.location.origin) return;

        adminAccessIssuedOriginRef.current = window.location.origin;
        inquiryApi.issueAdminAccess().catch((cause) => {
          adminAccessIssuedOriginRef.current = null;
          console.warn('Failed to refresh admin tool access for current origin:', cause);
        });
      })
      .catch((cause) => {
        console.warn('관리자 계정 정보를 불러오지 못했습니다 (fallback 사용):', cause);
        setOperator(FALLBACK_OPERATOR);
      });
  }, []);

  const switchAccount = async () => {
    const confirmed = await requestConfirmation({
      title: '로그인 계정 변경',
      message: '현재 계정에서 로그아웃하고 다른 계정으로 로그인하시겠습니까?',
      confirmLabel: '계정 변경',
    });
    if (confirmed) {
      window.location.href = `/api/v1/auth/logout?current=${encodeURIComponent(operator?.id || '')}`;
    }
  };

  return { operator, switchAccount };
}
