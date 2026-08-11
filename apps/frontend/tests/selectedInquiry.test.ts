import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSelectedInquiry } from '../src/features/inquiry/selectedInquiry.ts';

interface TestInquiry {
  id: string;
  content: string;
}

const inquiry = (id: string, content = id): TestInquiry => ({ id, content });

test('uses the latest visible inquiry data', () => {
  const previous = inquiry('inquiry-1', 'old content');
  const visible = inquiry('inquiry-1', 'updated content');

  assert.equal(
    resolveSelectedInquiry('inquiry-1', [visible], [], previous),
    visible,
  );
});

test('finds the selected inquiry in a cached page', () => {
  const cached = inquiry('inquiry-2');

  assert.equal(
    resolveSelectedInquiry('inquiry-2', [inquiry('inquiry-1')], [[cached]], null),
    cached,
  );
});

test('retains the same detail when refresh temporarily removes it', () => {
  const previous = inquiry('inquiry-1');

  assert.equal(
    resolveSelectedInquiry('inquiry-1', [], [], previous),
    previous,
  );
});

test('never shows a stale detail for a different selected id', () => {
  const previous = inquiry('inquiry-1');

  assert.equal(resolveSelectedInquiry('inquiry-2', [], [], previous), null);
});

test('clears detail when there is no selection', () => {
  assert.equal(resolveSelectedInquiry(null, [inquiry('inquiry-1')], [], inquiry('inquiry-1')), null);
});
