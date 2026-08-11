import type { InquiryStatus } from '../../types/inquiry';

export const INQUIRY_STATUSES: readonly InquiryStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

export const STATUS_LABELS: Readonly<Record<InquiryStatus, string>> = {
  OPEN: '미처리',
  IN_PROGRESS: '진행 중',
  RESOLVED: '완료',
};

export const MIN_STATUS_REASON_LENGTH = 5;
export const USER_CODE_LENGTH = 12;

export const IMAGE_POLICY = {
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxCount: 10,
  maxBytes: 10 * 1024 * 1024,
  maxDimension: 1600,
  compressionQuality: 0.78,
} as const;

export interface ChannelPresentation {
  className: string;
  label: string;
  kind: 'NAVER_CAFE' | 'GOOGLE_SHEET' | 'EMAIL' | 'PHONE' | 'MANUAL';
}

export interface UploadFileRequest {
  objectName: string;
  contentType: string;
}

export interface UploadRequestGroup {
  contentType: string;
  entries: Array<{ index: number; objectName: string }>;
}

export function groupUploadRequests(files: readonly UploadFileRequest[]): UploadRequestGroup[] {
  const groups = new Map<string, UploadRequestGroup['entries']>();
  files.forEach((file, index) => {
    const contentType = file.contentType || 'application/octet-stream';
    groups.set(contentType, [...(groups.get(contentType) || []), { index, objectName: file.objectName }]);
  });
  return [...groups.entries()].map(([contentType, entries]) => ({ contentType, entries }));
}

export function getStatusLabel(status: string): string {
  return status in STATUS_LABELS
    ? STATUS_LABELS[status as InquiryStatus]
    : status;
}

export function getChannelPresentation(channel: string): ChannelPresentation {
  const normalized = channel.toUpperCase();
  if (normalized.includes('NAVER_CAFE') || normalized.includes('CAFE')) {
    return { className: 'naver_cafe', label: '네이버 카페', kind: 'NAVER_CAFE' };
  }
  if (normalized.includes('GOOGLE_SHEET') || normalized.includes('SHEET')) {
    return { className: 'google_sheet', label: '구글 시트', kind: 'GOOGLE_SHEET' };
  }
  if (normalized.includes('EMAIL')) {
    return { className: 'email', label: '이메일', kind: 'EMAIL' };
  }
  if (normalized.includes('PHONE')) {
    return { className: 'phone', label: '전화 접수', kind: 'PHONE' };
  }
  return { className: 'manual', label: channel, kind: 'MANUAL' };
}

export function normalizeUserCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, USER_CODE_LENGTH);
}

export function isValidUserCode(value: string): boolean {
  return value === '' || new RegExp(`^\\d{${USER_CODE_LENGTH}}$`).test(value);
}

export function isValidStatusReason(value: string): boolean {
  return value.trim().length >= MIN_STATUS_REASON_LENGTH;
}

export function validateImageFiles(files: readonly File[], existingCount = 0): string | null {
  if (existingCount + files.length > IMAGE_POLICY.maxCount) {
    return `이미지는 최대 ${IMAGE_POLICY.maxCount}개까지 첨부할 수 있습니다.`;
  }

  for (const file of files) {
    if (!(IMAGE_POLICY.allowedTypes as readonly string[]).includes(file.type)) {
      return `지원하지 않는 파일 형식입니다: ${file.name}`;
    }
    if (file.size > IMAGE_POLICY.maxBytes) {
      return `파일 크기가 ${IMAGE_POLICY.maxBytes / 1024 / 1024}MB를 초과합니다: ${file.name}`;
    }
  }

  return null;
}

export function formatInquiryDate(
  value: string,
  precision: 'minute' | 'second' = 'second',
  year: 'numeric' | '2-digit' = 'numeric',
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: precision === 'second' ? '2-digit' : undefined,
    hour12: false,
  }).format(date);
}

export function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
