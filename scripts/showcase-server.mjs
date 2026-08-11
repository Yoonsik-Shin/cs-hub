import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.SHOWCASE_PORT || 4174);
const distRoot = new URL('../apps/frontend/dist/', import.meta.url).pathname;

const baseInquiry = {
  parentId: null,
  replyCount: 0,
  imageUrls: [],
  isManual: false,
  createdAt: '2026-08-11T00:00:00Z',
  updatedAt: '2026-08-11T00:00:00Z',
};

const inquiries = [
  {
    ...baseInquiry,
    id: 'showcase-email-001',
    channel: 'EMAIL',
    timestamp: '2026-08-11T08:42:00Z',
    userCode: '202608110001',
    status: 'OPEN',
    content: '러닝 기록이 두 번 저장되어 한 건을 삭제하고 싶습니다. 확인 부탁드립니다.',
    imageUrls: ['/showcase-attachment.svg'],
    channelMetadata: {
      metadataType: 'EMAIL',
      from: 'demo.runner@example.com',
      to: 'cs@example.com',
      subject: '러닝 기록 중복 저장 문의',
      date: '2026-08-11T08:42:00Z',
      headers: { 'message-id': 'showcase-email-001@example.com' },
      articleUrl: 'https://example.com/demo-mail/001',
    },
    deviceInfo: { appVersion: '4.2.1', model: 'Demo Phone Pro', osVersion: 'Demo OS 18' },
  },
  {
    ...baseInquiry,
    id: 'showcase-cafe-002',
    channel: 'NAVER_CAFE',
    timestamp: '2026-08-11T07:20:00Z',
    userCode: '202608110002',
    status: 'IN_PROGRESS',
    content: '인터벌 러닝 구간별 알림이 한 박자 늦게 재생됩니다.',
    channelMetadata: {
      metadataType: 'NAVER_CAFE',
      cafeId: 100001,
      articleId: 200002,
      menu: { id: 49, name: '앱 문의' },
      writer: { id: 'showcase-user', nickname: '데모 러너' },
      metrics: { readCount: 18, commentCount: 2, likeCount: 1 },
      articleUrl: 'https://example.com/demo-cafe/002',
      comments: [],
    },
    deviceInfo: { appVersion: '4.2.1', model: 'Demo Fold', osVersion: 'Demo OS 15' },
  },
  {
    ...baseInquiry,
    id: 'showcase-sheet-003',
    channel: 'GOOGLE_SHEET',
    timestamp: '2026-08-11T06:05:00Z',
    userCode: null,
    status: 'OPEN',
    content: '가족 계정과 운동 기록을 선택적으로 공유할 수 있는 기능을 제안합니다.',
    channelMetadata: {
      metadataType: 'GOOGLE_SHEET',
      rowNumber: 31,
      category: '기능 제안',
      type: '공유 기능',
      contact: 'showcase-contact',
    },
    deviceInfo: null,
  },
  {
    ...baseInquiry,
    id: 'showcase-phone-004',
    channel: 'PHONE',
    timestamp: '2026-08-10T09:15:00Z',
    userCode: '202608100004',
    status: 'RESOLVED',
    content: '결제 내역 확인 방법을 안내해 드렸습니다.',
    channelMetadata: {
      metadataType: 'PHONE',
      phoneNumber: '000-0000-0000',
      memo: '포트폴리오 촬영용 합성 데이터',
    },
    deviceInfo: null,
  },
  {
    ...baseInquiry,
    id: 'showcase-email-005',
    channel: 'EMAIL',
    timestamp: '2026-08-10T04:30:00Z',
    userCode: '202608100005',
    status: 'IN_PROGRESS',
    content: '완료 처리된 문의에 추가 질문이 있어 다시 회신드립니다.',
    channelMetadata: {
      metadataType: 'EMAIL',
      from: 'followup.runner@example.com',
      to: 'cs@example.com',
      subject: 'Re: 챌린지 기록 반영 문의',
      date: '2026-08-10T04:30:00Z',
      headers: {
        'message-id': 'showcase-email-005@example.com',
        'in-reply-to': 'showcase-parent@example.com',
      },
    },
    deviceInfo: { appVersion: '4.2.0', model: 'Demo Phone', osVersion: 'Demo OS 17' },
  },
];

const workLogs = {
  'showcase-email-001': [
    {
      id: 'showcase-log-001',
      inquiryId: 'showcase-email-001',
      actionType: 'INITIAL_SUBMISSION',
      answer: null,
      memo: '이메일 채널을 통해 문의가 접수되었습니다.',
      operatorInfo: { id: 'system', nickname: '시스템', email: '', role: 'SYSTEM' },
      previousStatus: null,
      currentStatus: 'OPEN',
      ipAddress: null,
      modificationDetails: null,
      createdAt: '2026-08-11T08:42:00Z',
    },
  ],
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function json(response, body, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function handleApi(request, response, url) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    json(response, { message: 'Showcase server is read-only.' }, 405);
    return;
  }
  if (url.pathname === '/api/v1/auth/me') {
    json(response, { id: 'portfolio-demo', nickname: '포트폴리오 데모', email: '', role: 'OPERATOR' });
  } else if (url.pathname === '/api/v1/auth/admin-tool-access') {
    json(response, {});
  } else if (url.pathname === '/api/v1/inquiries/count') {
    const statuses = url.searchParams.getAll('status');
    const missingUserCode = url.searchParams.get('userCodeMissing') === 'true';
    const count = inquiries.filter((item) => (
      (statuses.length === 0 || statuses.includes(item.status))
      && (!missingUserCode || item.userCode === null)
    )).length;
    json(response, { count, hasMore: false });
  } else if (url.pathname === '/api/v1/inquiries/bookmarks') {
    json(response, ['showcase-cafe-002']);
  } else if (url.pathname === '/api/v1/inquiries/custom-filters') {
    json(response, []);
  } else if (url.pathname === '/api/v1/naver/sessions/status') {
    json(response, { id: 'showcase-session', status: 'ACTIVE', updatedAt: '2026-08-11T08:30:00Z', valid: true });
  } else if (/^\/api\/v1\/inquiries\/[^/]+\/work-logs$/.test(url.pathname)) {
    const id = url.pathname.split('/')[4];
    json(response, workLogs[id] || []);
  } else if (/^\/api\/v1\/inquiries\/[^/]+\/replies$/.test(url.pathname)) {
    json(response, []);
  } else if (url.pathname === '/api/v1/inquiries') {
    json(response, { content: inquiries, nextCursor: null, hasNext: false });
  } else {
    json(response, { message: 'Unknown showcase endpoint.' }, 404);
  }
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  if (url.pathname === '/showcase-attachment.svg') {
    response.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
    response.end(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
        <rect width="1200" height="720" fill="#eef2ff"/>
        <rect x="90" y="80" width="1020" height="560" rx="32" fill="#ffffff" stroke="#c7d2fe" stroke-width="4"/>
        <text x="150" y="180" fill="#4338ca" font-family="system-ui, sans-serif" font-size="42" font-weight="700">합성 첨부 이미지</text>
        <text x="150" y="245" fill="#475569" font-family="system-ui, sans-serif" font-size="28">실제 고객 데이터 없이 이미지 뷰어 동작을 검증합니다.</text>
        <path d="M150 520 L360 330 L510 460 L690 270 L960 520 Z" fill="#a5b4fc"/>
        <circle cx="890" cy="220" r="64" fill="#fbbf24"/>
      </svg>
    `);
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    handleApi(request, response, url);
    return;
  }

  const requestedPath = url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^\/+/, '');
  let filePath = join(distRoot, requestedPath);
  if (!filePath.startsWith(distRoot) || !existsSync(filePath)) {
    filePath = join(distRoot, 'index.html');
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Showcase UI: http://127.0.0.1:${port}`);
});
