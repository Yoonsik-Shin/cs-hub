const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKFLOW_ID = 'nsbvUUSzjjH2zFic';
const LOCAL_WORKFLOW_PATH = path.join(__dirname, '../scratch_workflow.json');
const SHARED_DIR = path.join(__dirname, '../data/n8n');
const SHARED_TEMP_PATH = path.join(SHARED_DIR, 'scratch_workflow_temp.json');
const CONTAINER_TEMP_PATH = '/home/node/.n8n/scratch_workflow_temp.json';

let isSyncing = false;
let lastFileMtime = fs.existsSync(LOCAL_WORKFLOW_PATH) ? fs.statSync(LOCAL_WORKFLOW_PATH).mtimeMs : 0;

console.log('n8n 양방향 동기화 스크립트 시작됨...');
console.log(`감시 대상 파일: ${LOCAL_WORKFLOW_PATH}`);

// JSON을 정규화해서 문자열로 리턴 (단순 비교용)
function normalizeJson(str) {
  try {
    const obj = JSON.parse(str);
    // 비교 일관성을 위해 updatedAt 필드를 우선 확인
    return {
      updatedAt: obj.updatedAt || '',
      content: JSON.stringify(obj)
    };
  } catch (e) {
    return null;
  }
}

// n8n 컨테이너 준비 완료 여부 확인
function isContainerReady() {
  try {
    const status = execSync('docker inspect -f "{{.State.Running}}" n8n', { encoding: 'utf8' }).trim();
    return status === 'true';
  } catch (e) {
    return false;
  }
}

// DB ➡️ 로컬 파일 동기화
function syncN8nToLocal() {
  if (isSyncing) return;
  if (!isContainerReady()) return;

  isSyncing = true;
  try {
    // 1. n8n 컨테이너에서 워크플로우를 임시 파일로 내보냄
    execSync(`docker exec n8n n8n export:workflow --id=${WORKFLOW_ID} --output=${CONTAINER_TEMP_PATH}`, { stdio: 'ignore' });
    
    if (fs.existsSync(SHARED_TEMP_PATH)) {
      const exportedRaw = fs.readFileSync(SHARED_TEMP_PATH, 'utf8');
      const exportedNorm = normalizeJson(exportedRaw);
      
      let shouldUpdate = false;
      if (fs.existsSync(LOCAL_WORKFLOW_PATH)) {
        const localRaw = fs.readFileSync(LOCAL_WORKFLOW_PATH, 'utf8');
        const localNorm = normalizeJson(localRaw);
        
        if (exportedNorm && localNorm) {
          // updatedAt이 다르고 실제 내용이 다른 경우
          if (exportedNorm.updatedAt !== localNorm.updatedAt || exportedNorm.content !== localNorm.content) {
            shouldUpdate = true;
          }
        }
      } else {
        shouldUpdate = true;
      }
      
      if (shouldUpdate && exportedNorm) {
        console.log(`[n8n ➡️ Local] n8n 변경 감지됨. 로컬 scratch_workflow.json 업데이트 중...`);
        // 가지런히 서식 지정하여 저장
        const formatted = JSON.stringify(JSON.parse(exportedRaw), null, 2);
        fs.writeFileSync(LOCAL_WORKFLOW_PATH, formatted, 'utf8');
        lastFileMtime = fs.statSync(LOCAL_WORKFLOW_PATH).mtimeMs;
        console.log(`[n8n ➡️ Local] 동기화 완료.`);
      }
      
      // 임시 파일 정리
      if (fs.existsSync(SHARED_TEMP_PATH)) {
        fs.unlinkSync(SHARED_TEMP_PATH);
      }
    }
  } catch (err) {
    // n8n 내부에 해당 ID의 워크플로우가 아직 등록되지 않은 경우 등
    // 에러를 조용히 넘김 (초기 로딩 시점 대응)
  } finally {
    isSyncing = false;
  }
}

// 로컬 파일 ➡️ DB 동기화
function syncLocalToN8n() {
  if (isSyncing) return;
  if (!isContainerReady()) {
    console.log('[Local ➡️ n8n] n8n 컨테이너가 준비되지 않아 동기화를 보류합니다.');
    return;
  }

  isSyncing = true;
  try {
    if (!fs.existsSync(LOCAL_WORKFLOW_PATH)) {
      isSyncing = false;
      return;
    }
    
    console.log(`[Local ➡️ n8n] 로컬 파일 변경 감지됨. n8n으로 업데이트 중...`);
    
    // 1. 로컬 파일을 공유 폴더의 임시 경로에 복사
    fs.copyFileSync(LOCAL_WORKFLOW_PATH, SHARED_TEMP_PATH);
    
    // 2. n8n 컨테이너 내부 CLI로 임포트 실행
    execSync(`docker exec n8n n8n import:workflow --input=${CONTAINER_TEMP_PATH}`, { stdio: 'ignore' });
    
    console.log(`[Local ➡️ n8n] 동기화 완료.`);
    
    // 임시 파일 정리
    if (fs.existsSync(SHARED_TEMP_PATH)) {
      fs.unlinkSync(SHARED_TEMP_PATH);
    }
    
    // 동기화가 성공했으므로 최종 파일 mtime을 갱신
    lastFileMtime = fs.statSync(LOCAL_WORKFLOW_PATH).mtimeMs;
  } catch (err) {
    console.error(`[Local ➡️ n8n] 임포트 실패:`, err.message);
  } finally {
    isSyncing = false;
  }
}

// 주기적인 DB 감시 (3초마다 실행)
setInterval(syncN8nToLocal, 3000);

// 로컬 파일 변경 감시
let debounceTimeout = null;
fs.watch(path.dirname(LOCAL_WORKFLOW_PATH), (eventType, filename) => {
  if (filename === 'scratch_workflow.json') {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      if (fs.existsSync(LOCAL_WORKFLOW_PATH)) {
        const currentMtime = fs.statSync(LOCAL_WORKFLOW_PATH).mtimeMs;
        // 스크립트 자체 업데이트가 아닌 경우에만 동기화
        if (currentMtime > lastFileMtime + 100) {
          syncLocalToN8n();
        }
      }
    }, 500); // 500ms 디바운싱
  }
});
