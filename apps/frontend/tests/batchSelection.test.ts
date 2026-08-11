import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getVisibleSelectionState,
  retainVisibleSelection,
  toggleSelection,
  toggleVisibleSelection,
} from '../src/features/inquiry/batchSelection.ts';

test('individual toggle returns a new selection without mutating the input', () => {
  const original = new Set(['inquiry-1']);

  const selected = toggleSelection(original, 'inquiry-2', true);
  const deselected = toggleSelection(selected, 'inquiry-1', false);

  assert.deepEqual([...original], ['inquiry-1']);
  assert.deepEqual([...selected], ['inquiry-1', 'inquiry-2']);
  assert.deepEqual([...deselected], ['inquiry-2']);
});

test('select all adds visible inquiries while preserving previous selection', () => {
  const result = toggleVisibleSelection(
    new Set(['inquiry-from-another-page']),
    ['inquiry-1', 'inquiry-2'],
  );

  assert.deepEqual(
    [...result],
    ['inquiry-from-another-page', 'inquiry-1', 'inquiry-2'],
  );
});

test('select all removes only visible inquiries when all are selected', () => {
  const result = toggleVisibleSelection(
    new Set(['inquiry-from-another-page', 'inquiry-1', 'inquiry-2']),
    ['inquiry-1', 'inquiry-2'],
  );

  assert.deepEqual([...result], ['inquiry-from-another-page']);
});

test('empty page does not change selection', () => {
  const result = toggleVisibleSelection(new Set(['inquiry-1']), []);

  assert.deepEqual([...result], ['inquiry-1']);
});

test('refresh retains only inquiries that remain visible', () => {
  const result = retainVisibleSelection(
    new Set(['inquiry-1', 'inquiry-2']),
    ['inquiry-2', 'inquiry-3'],
  );

  assert.deepEqual([...result], ['inquiry-2']);
});

test('visible selection state distinguishes all, some, and none', () => {
  assert.deepEqual(
    getVisibleSelectionState(new Set(['inquiry-1', 'inquiry-2']), ['inquiry-1', 'inquiry-2']),
    { allSelected: true, someSelected: true },
  );
  assert.deepEqual(
    getVisibleSelectionState(new Set(['inquiry-1']), ['inquiry-1', 'inquiry-2']),
    { allSelected: false, someSelected: true },
  );
  assert.deepEqual(
    getVisibleSelectionState(new Set(), ['inquiry-1', 'inquiry-2']),
    { allSelected: false, someSelected: false },
  );
});
