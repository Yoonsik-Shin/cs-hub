import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getChannelPresentation,
  getStatusLabel,
  groupUploadRequests,
  isValidStatusReason,
  isValidUserCode,
  normalizeUserCode,
  validateImageFiles,
} from '../src/features/inquiry/policy.ts';

test('uses one presentation policy for status and channel labels', () => {
  assert.equal(getStatusLabel('IN_PROGRESS'), '진행 중');
  assert.equal(getChannelPresentation('NAVER_CAFE').label, '네이버 카페');
  assert.equal(getChannelPresentation('phone').label, '전화 접수');
});

test('groups upload signing requests by MIME type without losing original positions', () => {
  assert.deepEqual(groupUploadRequests([
    { objectName: 'first.png', contentType: 'image/png' },
    { objectName: 'middle.webp', contentType: 'image/webp' },
    { objectName: 'last.png', contentType: 'image/png' },
  ]), [
    {
      contentType: 'image/png',
      entries: [{ index: 0, objectName: 'first.png' }, { index: 2, objectName: 'last.png' }],
    },
    {
      contentType: 'image/webp',
      entries: [{ index: 1, objectName: 'middle.webp' }],
    },
  ]);
});

test('normalizes and validates the shared user-code contract', () => {
  assert.equal(normalizeUserCode('12a34-567890123'), '123456789012');
  assert.equal(isValidUserCode('123456789012'), true);
  assert.equal(isValidUserCode('1234'), false);
  assert.equal(isValidUserCode(''), true);
});

test('uses the same minimum reason policy for status changes', () => {
  assert.equal(isValidStatusReason('1234'), false);
  assert.equal(isValidStatusReason(' 12345 '), true);
});

test('validates image count, type, and size in a deterministic order', () => {
  const image = (name: string, type: string, size: number) => ({ name, type, size }) as File;
  assert.match(validateImageFiles([image('bad.svg', 'image/svg+xml', 10)], 0) || '', /지원하지 않는/);
  assert.match(validateImageFiles([image('large.png', 'image/png', 11 * 1024 * 1024)], 0) || '', /10MB/);
  assert.match(validateImageFiles([image('ok.png', 'image/png', 10)], 10) || '', /최대 10개/);
  assert.equal(validateImageFiles([image('ok.webp', 'image/webp', 10)], 0), null);
});
