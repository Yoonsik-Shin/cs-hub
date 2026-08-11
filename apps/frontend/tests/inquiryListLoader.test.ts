import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadInquiryListPage,
  type InquiryListGateway,
} from '../src/features/inquiry/inquiryListLoader.ts';
import type { SearchInquiriesParams } from '../src/types/inquiry.ts';

test('loads a page and its bounded matching count', async () => {
  const calls: Array<{ method: 'search' | 'count'; params: SearchInquiriesParams & { limit?: number } }> = [];
  const gateway: InquiryListGateway = {
    async searchInquiries(params) {
      calls.push({ method: 'search', params });
      return { content: [], nextCursor: 'next', hasNext: true };
    },
    async countInquiries(params) {
      calls.push({ method: 'count', params });
      return { count: 100, hasMore: true };
    },
  };

  const result = await loadInquiryListPage(
    gateway,
    { status: ['OPEN'], cursor: 'current', sort: 'desc' },
    20,
    100,
  );

  assert.deepEqual(calls, [
    {
      method: 'search',
      params: { status: ['OPEN'], cursor: 'current', sort: 'desc', size: 20 },
    },
    {
      method: 'count',
      params: { status: ['OPEN'], sort: 'desc', limit: 100 },
    },
  ]);
  assert.equal(result.page.nextCursor, 'next');
  assert.equal(result.totalCount, 100);
  assert.equal(result.totalHasMore, true);
});

test('does not mutate caller search parameters', async () => {
  const params: SearchInquiriesParams = { cursor: 'cursor', size: 50 };
  const gateway: InquiryListGateway = {
    async searchInquiries() {
      return { content: [], nextCursor: null, hasNext: false };
    },
    async countInquiries() {
      return { count: 0, hasMore: false };
    },
  };

  await loadInquiryListPage(gateway, params, 20, 100);

  assert.deepEqual(params, { cursor: 'cursor', size: 50 });
});
