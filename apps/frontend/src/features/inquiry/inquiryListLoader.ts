import type {
  CustomerInquiry,
  SearchInquiriesParams,
  SearchInquiriesResponse,
} from '../../types/inquiry';

interface InquiryCountResponse {
  count: number;
  hasMore: boolean;
}

export interface InquiryListGateway {
  searchInquiries(params: SearchInquiriesParams): Promise<SearchInquiriesResponse>;
  countInquiries(
    params: SearchInquiriesParams & { limit?: number },
  ): Promise<InquiryCountResponse>;
}

export interface InquiryListLoadResult {
  page: SearchInquiriesResponse;
  totalCount: number;
  totalHasMore: boolean;
}

export async function loadInquiryListPage(
  gateway: InquiryListGateway,
  searchParams: SearchInquiriesParams,
  pageSize: number,
  countLimit: number,
): Promise<InquiryListLoadResult> {
  const page = await gateway.searchInquiries({
    ...searchParams,
    size: pageSize,
  });

  const countParams = { ...searchParams };
  delete countParams.cursor;
  delete countParams.size;
  const count = await gateway.countInquiries({
    ...countParams,
    limit: countLimit,
  });

  return {
    page,
    totalCount: count.count,
    totalHasMore: count.hasMore,
  };
}

export function visibleInquiryIds(inquiries: readonly CustomerInquiry[]): string[] {
  return inquiries.map((inquiry) => inquiry.id);
}
