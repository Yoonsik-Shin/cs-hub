import type { SearchInquiriesParams, SearchInquiriesResponse, InquiryWorkLog } from '../types/inquiry';

/**
 * Helper to build query parameters string from object, omitting undefined/null values
 */
function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          query.append(key, String(item));
        }
      });
    } else if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
}

export const inquiryApi = {
  /**
   * Search and filter customer inquiries
   */
  async searchInquiries(params: SearchInquiriesParams): Promise<SearchInquiriesResponse> {
    const queryString = buildQueryString(params);
    const response = await fetch(`/api/internal/v1/inquiries${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to fetch inquiries: ${response.status} ${errorMsg}`);
    }

    return response.json();
  },

  /**
   * Count inquiries matching filters without fetching list items.
   */
  async countInquiries(params: SearchInquiriesParams & { limit?: number }): Promise<InquiryCountResponse> {
    const queryString = buildQueryString(params);
    const response = await fetch(`/api/internal/v1/inquiries/count${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to count inquiries: ${response.status} ${errorMsg}`);
    }

    return response.json();
  },

  /**
   * Create a new manual inquiry ticket on the backend
   */
  async createInquiry(data: { channel: string; userCode?: string; content: string }): Promise<void> {
    const response = await fetch('/api/internal/v1/inquiries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        channel: data.channel,
        userCode: data.userCode || null,
        content: data.content,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to create inquiry: ${response.status} ${errorMsg}`);
    }
  },

  /**
   * Register a new answer and/or memo log for a specific inquiry ticket
   */
  async createWorkLog(id: string, data: {
    operatorInfo: { id: string; nickname: string; email: string };
    answer?: string;
    memo?: string;
  }): Promise<void> {
    const response = await fetch(`/api/internal/v1/inquiries/${id}/work-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to register answer/memo log: ${response.status} ${errorMsg}`);
    }
  },

  /**
   * Manually change the status of an inquiry ticket (which records a status change log)
   */
  async updateInquiryStatus(id: string, data: {
    operatorInfo: { id: string; nickname: string; email: string };
    status: string;
  }): Promise<void> {
    const response = await fetch(`/api/internal/v1/inquiries/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to update status: ${response.status} ${errorMsg}`);
    }
  },

  /**
   * Update specific fields of an inquiry (which records a field modification log)
   */
  async updateInquiryFields(id: string, data: {
    operatorInfo: { id: string; nickname: string; email: string };
    channel?: string;
    userCode?: string;
    deviceInfo?: { appVersion?: string; model?: string; osVersion?: string } | null;
    content?: string;
    reasons: { channel?: string; userCode?: string; deviceInfo?: string; content?: string };
  }): Promise<void> {
    const response = await fetch(`/api/internal/v1/inquiries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to update inquiry fields: ${response.status} ${errorMsg}`);
    }
  },

  /**
   * Get all work logs / history for a specific inquiry ticket
   */
  async getWorkLogs(id: string): Promise<InquiryWorkLog[]> {
    const response = await fetch(`/api/internal/v1/inquiries/${id}/work-logs`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to fetch work logs: ${response.status} ${errorMsg}`);
    }

    return response.json();
  },

  /**
   * Renew Naver session using 8-digit one-time code
   */
  async renewNaverSession(code: string): Promise<void> {
    const response = await fetch('/api/internal/v1/naver/session/one-time-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        id: 'default',
        code: code,
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(errorMsg || `Session renewal failed with status ${response.status}`);
    }
  },

  /**
   * Get Naver session status and updated timestamp
   */
  async getNaverSessionStatus(): Promise<NaverSessionStatus> {
    const response = await fetch('/api/internal/v1/naver/session/status?id=default', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to fetch Naver session status: ${response.status} ${errorMsg}`);
    }

    return response.json();
  },

  /**
   * Synchronize Naver session status in real-time
   */
  async syncNaverSessionStatus(): Promise<NaverSessionStatus> {
    const response = await fetch('/api/internal/v1/naver/session/sync?id=default', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to sync Naver session: ${response.status} ${errorMsg}`);
    }

    return response.json();
  },
  /**
   * Nginx Basic Auth로 인증된 현재 관리자 계정 정보를 조회합니다.
   * Nginx가 proxy_set_header X-Remote-User $remote_user 를 통해 전달한 값을
   * 백엔드가 application.yml 설정과 매핑하여 반환합니다.
   */
  async getMe(): Promise<OperatorInfo> {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch operator info: ${response.status}`);
    }

    return response.json();
  },
};

export interface OperatorInfo {
  id: string;
  nickname: string;
  email: string;
}

export interface NaverSessionStatus {
  id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'MISSING';
  updatedAt: string | null;
  valid: boolean;
}

export interface InquiryCountResponse {
  count: number;
  hasMore: boolean;
}
