import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveImageNavigation } from '../src/features/inquiry/imageViewer.ts';

test('resolves previous and next images around the active image', () => {
  assert.deepEqual(resolveImageNavigation(['first', 'second', 'third'], 'second'), {
    index: 1,
    previous: 'first',
    next: 'third',
  });
});

test('does not navigate beyond image list boundaries', () => {
  assert.deepEqual(resolveImageNavigation(['only'], 'only'), {
    index: 0,
    previous: null,
    next: null,
  });
});

test('returns an inactive result for an image outside the list', () => {
  assert.deepEqual(resolveImageNavigation(['known'], 'missing'), {
    index: -1,
    previous: null,
    next: null,
  });
});
