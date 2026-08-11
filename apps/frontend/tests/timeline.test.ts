import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInquiryTimeline } from '../src/features/inquiry/timeline.ts';
import type { CustomerInquiry, InquiryWorkLog } from '../src/types/inquiry.ts';

const baseInquiry = (overrides: Partial<CustomerInquiry> = {}): CustomerInquiry => ({
  id: 'parent',
  parentId: null,
  channel: 'EMAIL',
  timestamp: '2026-01-01T00:00:00Z',
  userCode: 'customer-1',
  channelMetadata: null,
  deviceInfo: null,
  status: 'OPEN',
  content: 'question',
  imageUrls: [],
  isManual: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const workLog = (createdAt: string): InquiryWorkLog => ({
  id: 'work-log',
  inquiryId: 'parent',
  actionType: 'MEMO_ADDED',
  answer: null,
  memo: 'memo',
  operatorInfo: { id: 'operator', nickname: '담당자', email: '', role: 'OPERATOR' },
  previousStatus: 'OPEN',
  currentStatus: 'OPEN',
  ipAddress: null,
  modificationDetails: null,
  createdAt,
});

test('keeps initial submission first and sorts later activity chronologically', () => {
  const reply = baseInquiry({
    id: 'reply',
    parentId: 'parent',
    timestamp: '2026-01-02T02:00:00Z',
  });

  const timeline = buildInquiryTimeline(
    baseInquiry(),
    [workLog('2026-01-02T03:00:00Z')],
    [reply],
    '이메일',
  );

  assert.deepEqual(timeline.map((item) => item.id), [
    'initial_submission',
    'reply',
    'work-log',
  ]);
});

test('classifies the configured support sender as an operator answer', () => {
  const reply = baseInquiry({
    id: 'operator-reply',
    parentId: 'parent',
    channelMetadata: { from: 'Runday <runday@ttam.ai>' },
    content: 'answer',
  });

  const item = buildInquiryTimeline(baseInquiry(), [], [reply], '이메일')[1];

  assert.equal(item.actionType, 'ANSWER_SUBMITTED');
  assert.equal(item.answer, 'answer');
  assert.equal(item.memo, '');
});

test('adds a deterministic pending item when no handling activity exists', () => {
  const timeline = buildInquiryTimeline(
    baseInquiry(),
    [],
    [],
    '이메일',
    '2026-01-03T00:00:00Z',
  );

  assert.equal(timeline.at(-1)?.id, 'pending_action');
  assert.equal(timeline.at(-1)?.createdAt, '2026-01-03T00:00:00Z');
});

test('does not add a pending item to a resolved inquiry', () => {
  const timeline = buildInquiryTimeline(
    baseInquiry({ status: 'RESOLVED' }),
    [],
    [],
    '이메일',
  );

  assert.deepEqual(timeline.map((item) => item.id), ['initial_submission']);
});
