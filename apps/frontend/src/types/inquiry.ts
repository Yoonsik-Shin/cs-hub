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
  [key: string]: any;
}

export interface ChannelMetadata {
  uniqueKey?: string;
  title?: string;
  author?: string;
  imageUrls?: string[];
  customFields?: Record<string, any>;
  [key: string]: any;
}

export interface PhoneMetadata {
  metadataType: 'PHONE';
  phoneNumber: string;
  memo?: string;
  customFields?: Record<string, any>;
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
