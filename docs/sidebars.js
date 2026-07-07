// @ts-nocheck
// @ts-check

const fs = require('fs');
const path = require('path');

// 카테고리 클릭 시 리액트 크래시(useCurrentSidebarCategory)를 방지하기 위해, 
// 플러그인이 주입한 꼬인 절대경로 generated-index link 객체들을 재귀적으로 제거합니다.
/**
 * @param {any[]} items
 */
function cleanSidebarLinks(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item.type === 'category') {
      if (item.link && item.link.type === 'generated-index') {
        delete item.link;
      }
      if (item.items) {
        cleanSidebarLinks(item.items);
      }
    }
  }
}

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
let generatedApiSidebar = [];
try {
  const sidebarPath = path.resolve(__dirname, 'docs/api-native/sidebar.ts');
  if (fs.existsSync(sidebarPath)) {
    let content = fs.readFileSync(sidebarPath, 'utf-8');
    
    // Typescript import 구문 및 타입 어노테이션 제거
    content = content.replace(/import\s+type\s+[\s\S]*?from\s+.*?;/g, '');
    content = content.replace(/:\s*SidebarsConfig/g, '');
    content = content.replace(/export\s+default\s+[\s\S]*?;/g, '');
    
    // 객체 샌드박스 실행 후 리턴
    const sandbox = new Function(content + '\nreturn sidebar.apisidebar;');
    generatedApiSidebar = sandbox();
    
    // 꼬인 링크 필터링 정화 처리
    cleanSidebarLinks(generatedApiSidebar);
    
    console.log('[SIDEBAR] Successfully parsed & cleaned generated sidebar.ts. Items count:', generatedApiSidebar.length);
  }
} catch (e) {
  console.error('[SIDEBAR ERROR] Failed to parse generated sidebar.ts:', e.message);
}

const sidebars = {
  // 1. 위키 문서 전용 독립 사이드바
  wikiSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '위키 시작하기',
    },
    {
      type: 'category',
      label: '네이버 세션 자동화 가이드',
      collapsed: false,
      items: [
        'NAVER_SESSION_AUTOMATION'
      ],
    },
    {
      type: 'category',
      label: '시스템 아키텍처',
      collapsed: false,
      items: [
        'deployment-architecture',
        'infrastructure-architecture',
        'network-architecture',
        'security-policy',
        'code-architecture'
      ],
    },
    {
      type: 'category',
      label: '개발/운영 정책',
      collapsed: false,
      items: [
        'api-url-policy',
        'logging-observability-policy'
      ],
    },
  ],

  // 2. API 명세서 전용 독립 사이드바
  apiSidebar: generatedApiSidebar,
};

export default sidebars;
