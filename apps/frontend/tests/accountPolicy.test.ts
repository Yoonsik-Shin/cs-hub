import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAccountDraft } from '../src/features/account/policy.ts';

const validDraft = {
  username: 'operator_1',
  password: 'secret1',
  nickname: '운영자',
  email: 'operator@example.com',
};

test('accepts an account matching the backend contract', () => {
  assert.equal(validateAccountDraft(validDraft), null);
});

test('rejects values the backend would reject', () => {
  assert.match(validateAccountDraft({ ...validDraft, username: 'bad account' }) || '', /영문/);
  assert.match(validateAccountDraft({ ...validDraft, password: 'short' }) || '', /6자/);
  assert.match(validateAccountDraft({ ...validDraft, email: 'invalid' }) || '', /이메일/);
});
