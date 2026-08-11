import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRefreshInterval } from '../src/features/inquiry/refreshInterval.ts';

test('restores supported auto-refresh intervals', () => {
  assert.equal(parseRefreshInterval('10'), 10);
  assert.equal(parseRefreshInterval('300'), 300);
});

test('uses off for missing or malformed stored values', () => {
  assert.equal(parseRefreshInterval(null), 0);
  assert.equal(parseRefreshInterval(''), 0);
  assert.equal(parseRefreshInterval('not-a-number'), 0);
});

test('rejects numeric intervals that the UI does not support', () => {
  assert.equal(parseRefreshInterval('-1'), 0);
  assert.equal(parseRefreshInterval('1'), 0);
  assert.equal(parseRefreshInterval('999999'), 0);
});
