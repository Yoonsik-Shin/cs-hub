import assert from 'node:assert/strict';
import test from 'node:test';
import {
  replaceWithFirstPage,
  resolveRefreshTarget,
  storePage,
  updateCachedItem,
} from '../src/features/inquiry/pageCache.ts';

interface TestInquiry {
  id: string;
  status: 'OPEN' | 'RESOLVED';
}

const inquiry = (id: string, status: TestInquiry['status'] = 'OPEN'): TestInquiry => ({ id, status });

test('replacing the first page clears stale later pages', () => {
  const cache = replaceWithFirstPage({
    content: [inquiry('new-first')],
    nextCursor: 'cursor-1',
    hasNext: true,
  });

  assert.deepEqual(Object.keys(cache), ['1']);
  assert.equal(cache[1].inquiries[0].id, 'new-first');
});

test('storing a page preserves existing cached pages', () => {
  const firstPage = replaceWithFirstPage({
    content: [inquiry('first')],
    nextCursor: 'cursor-1',
    hasNext: true,
  });

  const cache = storePage(firstPage, 2, {
    content: [inquiry('second')],
    nextCursor: null,
    hasNext: false,
  });

  assert.equal(cache[1].inquiries[0].id, 'first');
  assert.equal(cache[2].inquiries[0].id, 'second');
});

test('refreshing a later page uses the previous page cursor', () => {
  const cache = storePage({}, 1, {
    content: [inquiry('first')],
    nextCursor: 'cursor-for-page-2',
    hasNext: true,
  });

  assert.deepEqual(resolveRefreshTarget(2, cache), {
    page: 2,
    cursor: 'cursor-for-page-2',
  });
});

test('refresh falls back to page one when the previous page is not cached', () => {
  assert.deepEqual(resolveRefreshTarget(3, {}), {
    page: 1,
    cursor: null,
  });
});

test('updating an item changes every cached occurrence without mutating input', () => {
  const original = {
    1: { inquiries: [inquiry('target')], nextCursor: 'cursor-1', hasNext: true },
    2: { inquiries: [inquiry('target'), inquiry('other')], nextCursor: null, hasNext: false },
  };

  const updated = updateCachedItem(original, 'target', { status: 'RESOLVED' });

  assert.equal(original[1].inquiries[0].status, 'OPEN');
  assert.equal(updated[1].inquiries[0].status, 'RESOLVED');
  assert.equal(updated[2].inquiries[0].status, 'RESOLVED');
  assert.equal(updated[2].inquiries[1], original[2].inquiries[1]);
});
