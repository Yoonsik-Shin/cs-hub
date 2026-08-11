import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpError, requestJson } from '../src/api/httpClient.ts';

test('uses the backend JSON error message and preserves status metadata', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ code: 'INVALID_REQUEST', message: '수정 사유가 필요합니다.' }),
    { status: 400, headers: { 'content-type': 'application/json' } },
  );

  try {
    await assert.rejects(
      requestJson('/api/test', {}, '요청 실패'),
      (error: unknown) => (
        error instanceof HttpError
        && error.status === 400
        && error.code === 'INVALID_REQUEST'
        && error.message === '수정 사유가 필요합니다.'
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('applies stable headers and serializes JSON once', async () => {
  const originalFetch = globalThis.fetch;
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    capturedInit = init;
    return Response.json({ ok: true });
  };

  try {
    const result = await requestJson<{ ok: boolean }>('/api/test', { method: 'POST', json: { value: 1 } });
    const headers = new Headers(capturedInit?.headers);
    assert.deepEqual(result, { ok: true });
    assert.equal(headers.get('accept'), 'application/json');
    assert.equal(headers.get('content-type'), 'application/json');
    assert.equal(capturedInit?.body, JSON.stringify({ value: 1 }));
    assert.equal('json' in (capturedInit || {}), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
