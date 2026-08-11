import type {
  ChannelMetadata,
  CustomerInquiry,
  CustomFilterEntity,
  InquiryStatus,
  InquiryWorkLog,
  OperatorInfo,
  SearchInquiriesParams,
  SearchInquiriesResponse,
} from '../types/inquiry';
import { requestJson, requestVoid, uploadFile } from './httpClient';
import { groupUploadRequests } from '../features/inquiry/policy';

export type BatchUpdateInquiryStatusTarget =
  | { mode: 'IDS'; inquiryIds: string[] }
  | { mode: 'FILTER'; filters: SearchInquiriesParams; excludedInquiryIds: string[] };

export interface CreateInquiryInput {
  channel: string;
  userCode?: string;
  content: string;
  channelMetadata?: ChannelMetadata;
  imageUrls?: string[];
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

interface PresignedUrl {
  objectName: string;
  uploadUrl: string;
  downloadUrl: string;
}

const NAVER_CAFE_SESSION_ID = '9f2b4d68-4d2c-4db6-a9ec-285809470036';

function buildQueryString(params: object): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') query.append(key, String(item));
      });
    } else if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

export const inquiryApi = {
  searchInquiries(params: SearchInquiriesParams): Promise<SearchInquiriesResponse> {
    return requestJson(`/api/v1/inquiries${buildQueryString(params)}`, {}, '문의 목록을 불러오지 못했습니다.');
  },

  countInquiries(params: SearchInquiriesParams & { limit?: number }): Promise<InquiryCountResponse> {
    return requestJson(`/api/v1/inquiries/count${buildQueryString(params)}`, {}, '문의 수를 불러오지 못했습니다.');
  },

  createInquiry(data: CreateInquiryInput): Promise<void> {
    return requestVoid('/api/v1/inquiries', {
      method: 'POST',
      json: {
        channel: data.channel,
        userCode: data.userCode || null,
        content: data.content,
        timestamp: new Date().toISOString(),
        channelMetadata: data.channelMetadata || null,
        imageUrls: data.imageUrls || [],
      },
    }, '문의를 생성하지 못했습니다.');
  },

  async getPresignedUrls(
    files: { objectName: string; contentType: string }[],
  ): Promise<PresignedUrl[]> {
    const result = new Array<PresignedUrl>(files.length);
    await Promise.all(groupUploadRequests(files).map(async ({ contentType, entries }) => {
      const response = await requestJson<{ urls: PresignedUrl[] }>('/api/v1/files/presigned-urls', {
        method: 'POST',
        json: { objectNames: entries.map((entry) => entry.objectName), contentType },
      }, '이미지 업로드 URL을 발급하지 못했습니다.');
      entries.forEach((entry, groupIndex) => {
        result[entry.index] = response.urls[groupIndex];
      });
    }));
    return result;
  },

  uploadToMinIO(uploadUrl: string, file: File): Promise<void> {
    const targetUrl = uploadUrl.includes('//minio:9000/')
      ? uploadUrl.replace('//minio:9000/', `//${window.location.host}/attachments/`)
      : uploadUrl;
    return uploadFile(targetUrl, file, '이미지를 업로드하지 못했습니다.');
  },

  createWorkLog(id: string, data: {
    operatorInfo: Pick<OperatorInfo, 'id' | 'nickname' | 'email'>;
    answer?: string;
    memo?: string;
    targetStatus?: InquiryStatus;
    statusReason?: string;
  }): Promise<void> {
    return requestVoid(`/api/v1/inquiries/${id}/work-logs`, {
      method: 'POST',
      json: data,
    }, '답변 또는 메모를 등록하지 못했습니다.');
  },

  updateInquiryStatus(id: string, data: {
    operatorInfo: Pick<OperatorInfo, 'id' | 'nickname' | 'email'>;
    status: InquiryStatus;
    reason: string;
  }): Promise<void> {
    return requestVoid(`/api/v1/inquiries/${id}`, {
      method: 'PATCH',
      json: {
        operatorInfo: data.operatorInfo,
        status: data.status,
        reasons: { status: data.reason },
      },
    }, '문의 상태를 변경하지 못했습니다.');
  },

  updateInquiryStatuses(
    target: BatchUpdateInquiryStatusTarget,
    status: InquiryStatus,
    reason: string,
  ): Promise<void> {
    return requestVoid('/api/v1/inquiries/batch/status', {
      method: 'PATCH',
      json: { ...target, status, reason },
    }, '문의 상태를 일괄 변경하지 못했습니다.');
  },

  updateInquiryFields(id: string, data: {
    operatorInfo: Pick<OperatorInfo, 'id' | 'nickname' | 'email'>;
    channel?: string;
    userCode?: string | null;
    deviceInfo?: { appVersion?: string; model?: string; osVersion?: string } | null;
    content?: string;
    imageUrls?: string[];
    customFields?: Record<string, unknown>;
    reasons: {
      channel?: string;
      userCode?: string;
      deviceInfo?: string;
      content?: string;
      imageUrls?: string;
      customFields?: string;
    };
  }): Promise<void> {
    return requestVoid(`/api/v1/inquiries/${id}`, {
      method: 'PATCH',
      json: data,
    }, '문의 정보를 수정하지 못했습니다.');
  },

  getWorkLogs(id: string): Promise<InquiryWorkLog[]> {
    return requestJson(`/api/v1/inquiries/${id}/work-logs`, {}, '업무 처리 이력을 불러오지 못했습니다.');
  },

  getReplies(parentId: string): Promise<CustomerInquiry[]> {
    return requestJson(`/api/v1/inquiries/${parentId}/replies`, {}, '고객 회신을 불러오지 못했습니다.');
  },

  getBookmarks(): Promise<string[]> {
    return requestJson('/api/v1/inquiries/bookmarks', {}, '즐겨찾기 목록을 불러오지 못했습니다.');
  },

  addBookmark(inquiryId: string): Promise<void> {
    return requestVoid(`/api/v1/inquiries/${inquiryId}/bookmark`, { method: 'POST' }, '즐겨찾기에 추가하지 못했습니다.');
  },

  removeBookmark(inquiryId: string): Promise<void> {
    return requestVoid(`/api/v1/inquiries/${inquiryId}/bookmark`, { method: 'DELETE' }, '즐겨찾기에서 제거하지 못했습니다.');
  },

  getCustomFilters(): Promise<CustomFilterEntity[]> {
    return requestJson('/api/v1/inquiries/custom-filters', {}, '저장된 필터를 불러오지 못했습니다.');
  },

  saveCustomFilter(name: string, filterData: CustomFilterEntity['filterData']): Promise<CustomFilterEntity> {
    return requestJson('/api/v1/inquiries/custom-filters', {
      method: 'POST',
      json: { name, filterData },
    }, '필터를 저장하지 못했습니다.');
  },

  deleteCustomFilter(id: number): Promise<void> {
    return requestVoid(`/api/v1/inquiries/custom-filters/${id}`, { method: 'DELETE' }, '필터를 삭제하지 못했습니다.');
  },

  renewNaverSession(code: string): Promise<void> {
    return requestVoid('/api/v1/naver/sessions/one-time-login', {
      method: 'POST',
      json: { id: NAVER_CAFE_SESSION_ID, code },
    }, '네이버 세션을 갱신하지 못했습니다.');
  },

  getNaverSessionStatus(): Promise<NaverSessionStatus> {
    return requestJson(`/api/v1/naver/sessions/status?id=${NAVER_CAFE_SESSION_ID}`, {}, '네이버 세션 상태를 불러오지 못했습니다.');
  },

  syncNaverSessionStatus(): Promise<NaverSessionStatus> {
    return requestJson(`/api/v1/naver/sessions/sync?id=${NAVER_CAFE_SESSION_ID}`, { method: 'POST' }, '네이버 세션 상태를 확인하지 못했습니다.');
  },

  refreshInquiry(id: string): Promise<CustomerInquiry> {
    return requestJson(`/api/v1/inquiries/${id}?refresh=true`, { method: 'PATCH' }, '문의 정보를 갱신하지 못했습니다.');
  },

  getMe(): Promise<OperatorInfo> {
    return requestJson('/api/v1/auth/me', {}, '현재 로그인 계정을 확인하지 못했습니다.');
  },

  issueAdminAccess(): Promise<void> {
    return requestVoid('/api/v1/auth/admin-tool-access', { method: 'POST' }, '관리자 도구 접근 권한을 발급하지 못했습니다.');
  },
};

export const accountApi = {
  getAccounts(): Promise<AdminAccount[]> {
    return requestJson('/api/v1/admin/accounts', {}, '계정 목록을 불러오지 못했습니다.');
  },

  createAccount(request: CreateAccountRequest): Promise<void> {
    return requestVoid('/api/v1/admin/accounts', { method: 'POST', json: request }, '계정을 생성하지 못했습니다.');
  },

  deleteAccount(username: string): Promise<void> {
    return requestVoid(`/api/v1/admin/accounts/${encodeURIComponent(username)}`, { method: 'DELETE' }, '계정을 삭제하지 못했습니다.');
  },
};
