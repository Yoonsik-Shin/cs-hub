import type { SearchInquiriesParams, SearchInquiriesResponse, InquiryWorkLog } from '../types/inquiry';

/**
 * Helper to build query parameters string from object, omitting undefined/null values
 */
function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
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
   * Renew Naver session using 8-digit one-time code and security token
   */
  async renewNaverSession(code: string, token: string): Promise<void> {
    const response = await fetch('/api/internal/v1/naver/session/one-time-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        id: 'default',
        code: code,
        token: token,
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
   * Validate Naver session cookies in real-time
   */
  async validateNaverSession(): Promise<NaverSessionStatus> {
    const response = await fetch('/api/internal/v1/naver/session/validate?id=default', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to validate Naver session: ${response.status} ${errorMsg}`);
    }

    return response.json();
  },
};

export interface NaverSessionStatus {
  id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'MISSING';
  updatedAt: string | null;
  valid: boolean;
}

