export type InquiryStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface OperatorInfo {
  id: string;
  nickname: string;
  email: string;
}

export interface FieldModification {
  field: string;
  beforeValue: string | null;
  afterValue: string | null;
  reason: string;
}

export interface InquiryWorkLog {
  id: string;
  inquiryId: string;
  actionType: 'ANSWER_SUBMITTED' | 'MEMO_ADDED' | 'ANSWER_AND_MEMO_SUBMITTED' | 'STATUS_CHANGED' | 'FIELD_MODIFIED';
  answer: string | null;
  memo: string | null;
  operatorInfo: OperatorInfo;
  previousStatus: InquiryStatus | null;
  currentStatus: InquiryStatus | null;
  ipAddress: string | null;
  modificationDetails: FieldModification[] | null;
  createdAt: string;
}

export interface DeviceInfo {
  appVersion?: string;
  os?: string;
  deviceModel?: string;
  [key: string]: any;
}

export interface ChannelMetadata {
  uniqueKey?: string;
  title?: string;
  author?: string;
  imageUrls?: string[];
  [key: string]: any;
}

export interface CustomerInquiry {
  id: string;
  channel: string;
  timestamp: string;
  userCode: string | null;
  channelMetadata: ChannelMetadata | null;
  deviceInfo: DeviceInfo | null;
  status: InquiryStatus;
  content: string;
  imageUrls?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchInquiriesResponse {
  content: CustomerInquiry[];
  nextCursor: string | null;
  hasNext: boolean;
}

export interface SearchInquiriesParams {
  channel?: string | string[];
  userCode?: string;
  status?: InquiryStatus | InquiryStatus[];
  keyword?: string;
  start?: string; // ISO 8601 string
  end?: string;   // ISO 8601 string
  cursor?: string; // UUID string
  size?: number;
}
