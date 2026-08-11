interface ApiErrorPayload {
  code?: string;
  message?: string;
  error?: string;
}

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(
    status: number,
    message: string,
    code?: string,
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
  body?: BodyInit;
}

async function readError(response: Response, fallback: string): Promise<HttpError> {
  const contentType = response.headers.get('content-type') || '';
  let message = '';
  let code: string | undefined;

  if (contentType.includes('application/json')) {
    try {
      const payload = await response.json() as ApiErrorPayload;
      message = payload.message || payload.error || '';
      code = payload.code;
    } catch {
      // Fall through to the stable operation-level fallback.
    }
  } else {
    try {
      message = (await response.text()).trim();
    } catch {
      // Fall through to the stable operation-level fallback.
    }
  }

  return new HttpError(
    response.status,
    message || `${fallback} (${response.status})`,
    code,
  );
}

async function request(url: string, options: RequestOptions, fallback: string): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  const { json, body: configuredBody, ...requestOptions } = options;

  let body = configuredBody;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const response = await fetch(url, {
    ...requestOptions,
    headers,
    body,
  });

  if (!response.ok) {
    throw await readError(response, fallback);
  }

  return response;
}

export async function requestJson<T>(
  url: string,
  options: RequestOptions = {},
  fallback = '요청에 실패했습니다.',
): Promise<T> {
  const response = await request(url, options, fallback);
  return response.json() as Promise<T>;
}

export async function requestVoid(
  url: string,
  options: RequestOptions = {},
  fallback = '요청에 실패했습니다.',
): Promise<void> {
  await request(url, options, fallback);
}

export async function uploadFile(
  url: string,
  file: File,
  fallback = '파일 업로드에 실패했습니다.',
): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });

  if (!response.ok) {
    throw await readError(response, fallback);
  }
}
