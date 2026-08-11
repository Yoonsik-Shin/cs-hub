export type InquiryStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface OperatorInfo {
  id: string;
  nickname: string;
  email: string;
  role: string;
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
  actionType: 'INITIAL_SUBMISSION' | 'PENDING_ACTION' | 'ANSWER_SUBMITTED' | 'MEMO_ADDED' | 'ANSWER_AND_MEMO_SUBMITTED' | 'STATUS_CHANGED' | 'FIELD_MODIFIED' | 'BOOKMARK_ADDED' | 'BOOKMARK_REMOVED' | 'CUSTOMER_REPLY';
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
  model?: string;
  osVersion?: string;
  [key: string]: unknown;
}

export interface ChannelMetadata {
  metadataType?: string;
  uniqueKey?: string;
  title?: string;
  author?: string;
  articleUrl?: string;
  imageUrls?: string[];
  cafeId?: string | number;
  articleId?: string | number;
  menu?: { id?: string | number; name?: string };
  writer?: { id?: string; nickname?: string };
  metrics?: { readCount?: number; commentCount?: number; likeCount?: number };
  rowNumber?: string | number;
  category?: string;
  type?: string;
  contact?: string;
  reply?: { type?: string; email?: string };
  headers?: { 'message-id'?: string; messageId?: string; [key: string]: unknown };
  attributes?: { uid?: number; [key: string]: unknown };
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  phoneNumber?: string;
  memo?: string;
  isOperator?: boolean;
  comments?: Array<{
    commentId: string | number;
    content: string;
    writer?: { id?: string; nickname?: string };
    writeDate: string;
    isOperator?: boolean;
    imageUrls?: string[];
  }>;
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PhoneMetadata {
  metadataType: 'PHONE';
  phoneNumber: string;
  memo?: string;
  customFields?: Record<string, unknown>;
}

export interface CustomerInquiry {
  id: string;
  parentId: string | null;
  replyCount?: number;
  channel: string;
  timestamp: string;
  userCode: string | null;
  channelMetadata: ChannelMetadata | null;
  deviceInfo: DeviceInfo | null;
  status: InquiryStatus;
  content: string;
  imageUrls?: string[] | null;
  isManual: boolean;
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
  userCodeMissing?: boolean;
  status?: InquiryStatus | InquiryStatus[];
  start?: string; // ISO 8601 string
  end?: string;   // ISO 8601 string
  isManual?: boolean;
  bookmarkedOnly?: boolean;
  cursor?: string; // UUID string
  size?: number;
  sort?: 'asc' | 'desc';
}

export interface CustomFilterEntity {
  id: number;
  operatorId: string;
  name: string;
  filterData: Partial<SearchInquiriesParams> & {
    userCode?: string;
    userCodeMissing?: boolean;
    statuses?: InquiryStatus[];
    channels?: string[];
    startDate?: string;
    endDate?: string;
    isManual?: boolean;
    bookmarkedOnly?: boolean;
  };
  createdAt: string;
}
