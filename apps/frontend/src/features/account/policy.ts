export const ACCOUNT_POLICY = {
  username: { minLength: 4, maxLength: 50, pattern: /^[a-zA-Z0-9_-]+$/ },
  password: { minLength: 6, maxLength: 100 },
  nickname: { maxLength: 50 },
  email: { maxLength: 100, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
} as const;

interface AccountDraft {
  username: string;
  password: string;
  nickname: string;
  email: string;
}

export function validateAccountDraft(draft: AccountDraft): string | null {
  const username = draft.username.trim();
  const nickname = draft.nickname.trim();
  const email = draft.email.trim();

  if (!username || !draft.password.trim() || !nickname) {
    return '아이디, 비밀번호, 표시 이름은 필수 입력 항목입니다.';
  }
  if (username.length < ACCOUNT_POLICY.username.minLength || username.length > ACCOUNT_POLICY.username.maxLength) {
    return `아이디는 ${ACCOUNT_POLICY.username.minLength}자 이상 ${ACCOUNT_POLICY.username.maxLength}자 이하여야 합니다.`;
  }
  if (!ACCOUNT_POLICY.username.pattern.test(username)) {
    return '아이디는 영문, 숫자, 언더바(_), 하이픈(-)만 사용할 수 있습니다.';
  }
  if (draft.password.length < ACCOUNT_POLICY.password.minLength || draft.password.length > ACCOUNT_POLICY.password.maxLength) {
    return `비밀번호는 ${ACCOUNT_POLICY.password.minLength}자 이상 ${ACCOUNT_POLICY.password.maxLength}자 이하여야 합니다.`;
  }
  if (nickname.length > ACCOUNT_POLICY.nickname.maxLength) {
    return `표시 이름은 ${ACCOUNT_POLICY.nickname.maxLength}자 이하여야 합니다.`;
  }
  if (email && !ACCOUNT_POLICY.email.pattern.test(email)) {
    return '이메일 형식이 올바르지 않습니다.';
  }
  if (email.length > ACCOUNT_POLICY.email.maxLength) {
    return `이메일은 ${ACCOUNT_POLICY.email.maxLength}자 이하여야 합니다.`;
  }
  return null;
}
