import fs from 'fs';
import http from 'http';
import { exec } from 'child_process';
import crypto from 'crypto';

const SPEC_URL = process.env.BACKEND_API_URL || 'http://localhost:8080/v3/api-docs';
const OUTPUT_PATH = './openapi/swagger.json';
const INTERVAL_MS = 300000; // 5분마다 백엔드 스펙 검사

let lastSpecHash = '';
let isFirstCheck = true; // 최초 구동 시 강제 1회 갱신 플래그

// JSON 객체의 모든 키들을 재귀적으로 정렬하는 정적 정규화 함수 (백엔드 Map 순서 혼선 방지)
function sortJsonObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortJsonObject);
  }
  return Object.keys(obj).sort().reduce((sorted, key) => {
    sorted[key] = sortJsonObject(obj[key]);
    return sorted;
  }, {});
}

// 기존 로컬 파일이 있으면 해시 초기값 설정
if (fs.existsSync(OUTPUT_PATH)) {
  try {
    const fileContent = fs.readFileSync(OUTPUT_PATH, 'utf-8');
    const parsed = JSON.parse(fileContent);
    const sorted = sortJsonObject(parsed);
    const formatted = JSON.stringify(sorted, null, 2);
    lastSpecHash = crypto.createHash('md5').update(formatted).digest('hex');
    console.log(`[WATCHER] Loaded existing spec hash: ${lastSpecHash}`);
  } catch (err) {
    console.error('[WATCHER] Failed to read existing spec file:', err.message);
  }
}

function getMd5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function generateDocs() {
  console.log('[WATCHER] API Spec change detected! Regenerating native docs...');
  
  const sidebarTsPath = './docs/api-native/sidebar.ts';
  const sidebarJsPath = './docs/api-native/sidebar.js';
  
  try {
    if (fs.existsSync(sidebarTsPath)) {
      fs.unlinkSync(sidebarTsPath);
      console.log(`[WATCHER] Cleaned up: ${sidebarTsPath}`);
    }
    if (fs.existsSync(sidebarJsPath)) {
      fs.unlinkSync(sidebarJsPath);
      console.log(`[WATCHER] Cleaned up: ${sidebarJsPath}`);
    }
  } catch (err) {
    console.error('[WATCHER] Failed to delete sidebar cache file:', err.message);
  }

  // 이제 명세를 기반으로 재생성 명령을 수행하여 덮어씁니다.
  exec('npx docusaurus gen-api-docs myApi', (err, stdout, stderr) => {
    if (err) {
      console.error('[WATCHER] Failed to regenerate api docs:', err.message);
      return;
    }
    console.log('[WATCHER] Successfully regenerated native api docs with fresh sidebar.');
    
    // Docusaurus 개발 서버가 sidebars.js 자체의 변경만 파일 감시(Watcher)하므로,
    // sidebar.ts가 재생성된 후 sidebars.js 파일의 수정시간(mtime)을 강제로 갱신(touch)하여
    // Docusaurus가 캐시를 날리고 새로 쓰인 명세를 리로드하도록 트리거합니다!
    try {
      const sidebarsJsPath = './sidebars.js';
      if (fs.existsSync(sidebarsJsPath)) {
        const now = new Date();
        fs.utimesSync(sidebarsJsPath, now, now);
        console.log('[WATCHER] Touched sidebars.js to force Docusaurus reload.');
      }
    } catch (touchErr) {
      console.error('[WATCHER] Failed to touch sidebars.js:', touchErr.message);
    }
  });
}

function checkSpec() {
  http.get(SPEC_URL, (res) => {
    if (res.statusCode !== 200) {
      return;
    }

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        
        // JSON 키 정렬을 거친 일관된 텍스트 생성
        const sorted = sortJsonObject(parsed);
        const formatted = JSON.stringify(sorted, null, 2);
        const currentHash = getMd5(formatted);
        
        // 해시가 달라졌거나 최초 기동 시 강제 실행
        if (currentHash !== lastSpecHash || isFirstCheck) {
          const wasFirst = isFirstCheck;
          isFirstCheck = false;
          lastSpecHash = currentHash;
          
          fs.writeFileSync(OUTPUT_PATH, formatted, 'utf-8');
          console.log(`[WATCHER] Spec updated (Hash: ${currentHash}, Force first: ${wasFirst})`);
          
          generateDocs();
        }
      } catch (err) {
        // JSON 파싱 에러시 무시
      }
    });
  }).on('error', (err) => {
    // 연결 실패 시 무시
  });
}

console.log(`[WATCHER] Starting API Spec poll watcher targeting: ${SPEC_URL}`);
checkSpec();
setInterval(checkSpec, INTERVAL_MS);
