import type {
  CustomerInquiry,
  CustomFilterEntity,
  InquiryStatus,
  InquiryWorkLog,
  SearchInquiriesParams,
  SearchInquiriesResponse,
} from "../types/inquiry";

export type BatchUpdateInquiryStatusTarget =
  | {
      mode: "IDS";
      inquiryIds: string[];
    }
  | {
      mode: "FILTER";
      filters: SearchInquiriesParams;
      excludedInquiryIds: string[];
    };

const NAVER_CAFE_SESSION_ID = "9f2b4d68-4d2c-4db6-a9ec-285809470036";

/**
 * Helper to build query parameters string from object, omitting undefined/null values
 */
function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          query.append(key, String(item));
        }
      });
    } else if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });
  const str = query.toString();
  return str ? `?${str}` : "";
}

export const inquiryApi = {
  /**
   * Search and filter customer inquiries
   */
  async searchInquiries(
    params: SearchInquiriesParams,
  ): Promise<SearchInquiriesResponse> {
    const queryString = buildQueryString(params);
    const response = await fetch(`/api/v1/inquiries${queryString}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to fetch inquiries: ${response.status} ${errorMsg}`,
      );
    }

    return response.json();
  },

  /**
   * Count inquiries matching filters without fetching list items.
   */
  async countInquiries(
    params: SearchInquiriesParams & { limit?: number },
  ): Promise<InquiryCountResponse> {
    const queryString = buildQueryString(params);
    const response = await fetch(`/api/v1/inquiries/count${queryString}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to count inquiries: ${response.status} ${errorMsg}`,
      );
    }

    return response.json();
  },

  /**
   * Create a new manual inquiry ticket on the backend
   */
  async createInquiry(data: {
    channel: string;
    userCode?: string;
    content: string;
    channelMetadata?: any;
    imageUrls?: string[];
  }): Promise<void> {
    const response = await fetch("/api/v1/inquiries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        channel: data.channel,
        userCode: data.userCode || null,
        content: data.content,
        timestamp: new Date().toISOString(),
        channelMetadata: data.channelMetadata || null,
        imageUrls: data.imageUrls || [],
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to create inquiry: ${response.status} ${errorMsg}`,
      );
    }
  },

  /**
   * Batch request presigned upload URLs from MinIO via the backend
   */
  async getPresignedUrls(
    files: { objectName: string; contentType: string }[],
  ): Promise<{ objectName: string; uploadUrl: string; downloadUrl: string }[]> {
    const response = await fetch("/api/v1/files/presigned-urls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        objectNames: files.map((f) => f.objectName),
        contentType: files[0]?.contentType,
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to get presigned URLs: ${response.status} ${errorMsg}`,
      );
    }

    const data = await response.json();
    return data.urls;
  },

  /**
   * Upload a single file directly to MinIO via presigned PUT URL
   */
  async uploadToMinIO(uploadUrl: string, file: File): Promise<void> {
    let targetUrl = uploadUrl;
    if (uploadUrl.includes("//minio:9000/")) {
      targetUrl = uploadUrl.replace(
        "//minio:9000/",
        `//${window.location.host}/attachments/`,
      );
    }

    const response = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`MinIO upload failed: ${response.status}`);
    }
  },

  /**
   * Register a new answer and/or memo log for a specific inquiry ticket
   */
  async createWorkLog(
    id: string,
    data: {
      operatorInfo: { id: string; nickname: string; email: string };
      answer?: string;
      memo?: string;
    },
  ): Promise<void> {
    const response = await fetch(`/api/v1/inquiries/${id}/work-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to register answer/memo log: ${response.status} ${errorMsg}`,
      );
    }
  },

  /**
   * Manually change the status of an inquiry ticket (which records a status change log)
   */
  async updateInquiryStatus(
    id: string,
    data: {
      operatorInfo: { id: string; nickname: string; email: string };
      status: string;
      reason: string;
    },
  ): Promise<void> {
    const response = await fetch(`/api/v1/inquiries/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to update status: ${response.status} ${errorMsg}`,
      );
    }
  },

  /**
   * Batch change the status of multiple inquiry tickets
   */
  async updateInquiryStatuses(
    target: BatchUpdateInquiryStatusTarget,
    status: InquiryStatus,
    reason: string,
  ): Promise<void> {
    const response = await fetch("/api/v1/inquiries/batch/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        ...target,
        status,
        reason,
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to update status in batch: ${response.status} ${errorMsg}`,
      );
    }
  },

  /**
   * Update specific fields of an inquiry (which records a field modification log)
   */
  async updateInquiryFields(
    id: string,
    data: {
      operatorInfo: { id: string; nickname: string; email: string };
      channel?: string;
      userCode?: string;
      deviceInfo?: {
        appVersion?: string;
        model?: string;
        osVersion?: string;
      } | null;
      content?: string;
      imageUrls?: string[];
      reasons: {
        channel?: string;
        userCode?: string;
        deviceInfo?: string;
        content?: string;
      };
    },
  ): Promise<void> {
    const response = await fetch(`/api/v1/inquiries/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to update inquiry fields: ${response.status} ${errorMsg}`,
      );
    }
  },

  /**
   * Get all work logs / history for a specific inquiry ticket
   */
  async getWorkLogs(id: string): Promise<InquiryWorkLog[]> {
    const response = await fetch(`/api/v1/inquiries/${id}/work-logs`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to fetch work logs: ${response.status} ${errorMsg}`,
      );
    }

    return response.json();
  },

  async getReplies(parentId: string): Promise<CustomerInquiry[]> {
    const response = await fetch(`/api/v1/inquiries/${parentId}/replies`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to fetch replies: ${response.status} ${errorMsg}`,
      );
    }

    return response.json();
  },

  async getBookmarks(): Promise<string[]> {
    const response = await fetch("/api/v1/inquiries/bookmarks", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to fetch bookmarks: ${response.status} ${errorMsg}`,
      );
    }

    return response.json();
  },

  async addBookmark(inquiryId: string): Promise<void> {
    const response = await fetch(`/api/v1/inquiries/${inquiryId}/bookmark`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to add bookmark: ${response.status} ${errorMsg}`);
    }
  },

  async removeBookmark(inquiryId: string): Promise<void> {
    const response = await fetch(`/api/v1/inquiries/${inquiryId}/bookmark`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to remove bookmark: ${response.status} ${errorMsg}`,
      );
    }
  },

  async getCustomFilters(): Promise<CustomFilterEntity[]> {
    const response = await fetch("/api/v1/inquiries/custom-filters", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to fetch custom filters: ${response.status} ${errorMsg}`,
      );
    }

    return response.json();
  },

  async saveCustomFilter(
    name: string,
    filterData: Record<string, any>,
  ): Promise<CustomFilterEntity> {
    const response = await fetch("/api/v1/inquiries/custom-filters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name, filterData }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to save custom filter: ${response.status} ${errorMsg}`,
      );
    }

    return response.json();
  },

  async deleteCustomFilter(id: number): Promise<void> {
    const response = await fetch(`/api/v1/inquiries/custom-filters/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to delete custom filter: ${response.status} ${errorMsg}`,
      );
    }
  },

  /**
   * Renew Naver session using 8-digit one-time code
   */
  async renewNaverSession(code: string): Promise<void> {
    const response = await fetch("/api/v1/naver/sessions/one-time-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id: NAVER_CAFE_SESSION_ID,
        code: code,
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        errorMsg || `Session renewal failed with status ${response.status}`,
      );
    }
  },

  /**
   * Get Naver session status and updated timestamp
   */
  async getNaverSessionStatus(): Promise<NaverSessionStatus> {
    const response = await fetch(`/api/v1/naver/sessions/status?id=${NAVER_CAFE_SESSION_ID}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to fetch Naver session status: ${response.status} ${errorMsg}`,
      );
    }

    return response.json();
  },

  /**
   * Synchronize Naver session status in real-time
   */
  async syncNaverSessionStatus(): Promise<NaverSessionStatus> {
    const response = await fetch(`/api/v1/naver/sessions/sync?id=${NAVER_CAFE_SESSION_ID}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(
        `Failed to sync Naver session: ${response.status} ${errorMsg}`,
      );
    }

    return response.json();
  },
  /**
   * Nginx Basic Auth로 인증된 현재 관리자 계정 정보를 조회합니다.
   * Nginx가 proxy_set_header X-Remote-User $remote_user 를 통해 전달한 값을
   * 백엔드가 application.yml 설정과 매핑하여 반환합니다.
   */
  async getMe(): Promise<OperatorInfo> {
    const response = await fetch("/api/v1/auth/me", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch operator info: ${response.status}`);
    }

    return response.json();
  },

  async issueAdminAccess(): Promise<void> {
    const response = await fetch("/api/v1/auth/admin-access", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to issue admin access token: ${response.status}`);
    }
  },
};

export interface OperatorInfo {
  id: string;
  nickname: string;
  email: string;
  role: string;
}

export interface AdminAccount {
  username: string;
  nickname: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface CreateAccountRequest {
  username: string;
  password: string;
  nickname: string;
  email: string;
  role: string;
}

export interface NaverSessionStatus {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "MISSING";
  updatedAt: string | null;
  valid: boolean;
}

export interface InquiryCountResponse {
  count: number;
  hasMore: boolean;
}

export const accountApi = {
  async getAccounts(): Promise<AdminAccount[]> {
    const response = await fetch("/api/v1/admin/accounts", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok)
      throw new Error(`Failed to fetch accounts: ${response.status}`);
    return response.json();
  },

  async createAccount(request: CreateAccountRequest): Promise<void> {
    const response = await fetch("/api/v1/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to create account: ${response.status}`);
    }
  },

  async deleteAccount(username: string): Promise<void> {
    const response = await fetch(
      `/api/v1/admin/accounts/${encodeURIComponent(username)}`,
      {
        method: "DELETE",
      },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to delete account: ${response.status}`);
    }
  },
};
