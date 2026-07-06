const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKFLOWS = [
  {
    id: 'nsbvUUSzjjH2zFic',
    localPath: path.join(__dirname, './scratch_workflow.json'),
    tempName: 'scratch_workflow_temp.json',
    containerTempPath: '/home/node/.n8n/scratch_workflow_temp.json',
    sharedTempPath: path.join(__dirname, '../../data/n8n/scratch_workflow_temp.json'),
    displayName: 'CS 데이터 통합',
    lastFileMtime: 0
  },
  {
    id: 'error-handler-wf',
    localPath: path.join(__dirname, './error_workflow.json'),
    tempName: 'error_workflow_temp.json',
    containerTempPath: '/home/node/.n8n/error_workflow_temp.json',
    sharedTempPath: path.join(__dirname, '../../data/n8n/error_workflow_temp.json'),
    displayName: 'CS 데이터 통합 에러 처리',
    lastFileMtime: 0
  }
];

// 각 워크플로우의 초기 mtime 설정
WORKFLOWS.forEach(wf => {
  wf.lastFileMtime = fs.existsSync(wf.localPath) ? fs.statSync(wf.localPath).mtimeMs : 0;
});

let isSyncing = false;

console.log('n8n 양방향 다중 워크플로우 동기화 스크립트 시작됨...');
WORKFLOWS.forEach(wf => {
  console.log(`감시 대상 워크플로우 [${wf.displayName}]: ${wf.localPath}`);
});

// JSON을 정규화해서 문자열로 리턴 (단순 비교용)
function normalizeJson(str) {
  try {
    const parsed = JSON.parse(str);
    // 배열 형태인 경우(n8n export --all 등)와 객체 형태 모두 정규화 처리
    const obj = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!obj) return null;
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
function syncN8nToLocal(wf) {
  if (isSyncing) return;
  if (!isContainerReady()) return;

  isSyncing = true;
  try {
    // 1. n8n 컨테이너에서 워크플로우를 임시 파일로 내보냄
    execSync(`docker exec n8n n8n export:workflow --id=${wf.id} --output=${wf.containerTempPath}`, { stdio: 'ignore' });
    
    if (fs.existsSync(wf.sharedTempPath)) {
      const exportedRaw = fs.readFileSync(wf.sharedTempPath, 'utf8');
      const exportedNorm = normalizeJson(exportedRaw);
      
      let shouldUpdate = false;
      if (fs.existsSync(wf.localPath)) {
        const localRaw = fs.readFileSync(wf.localPath, 'utf8');
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
        console.log(`[n8n ➡️ Local] [${wf.displayName}] 변경 감지됨. 로컬 파일 업데이트 중...`);
        // 가지런히 서식 지정하여 저장 (n8n export:workflow는 단일 객체 또는 배열을 뱉음. 일관되게 배열 또는 객체 형태로 유지)
        const parsed = JSON.parse(exportedRaw);
        const formatted = JSON.stringify(parsed, null, 2);
        fs.writeFileSync(wf.localPath, formatted, 'utf8');
        wf.lastFileMtime = fs.statSync(wf.localPath).mtimeMs;
        console.log(`[n8n ➡️ Local] [${wf.displayName}] 동기화 완료.`);
      }
      
      // 임시 파일 정리
      if (fs.existsSync(wf.sharedTempPath)) {
        fs.unlinkSync(wf.sharedTempPath);
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
function syncLocalToN8n(wf) {
  if (isSyncing) return;
  if (!isContainerReady()) {
    console.log(`[Local ➡️ n8n] n8n 컨테이너가 준비되지 않아 [${wf.displayName}] 동기화를 보류합니다.`);
    return;
  }

  isSyncing = true;
  try {
    if (!fs.existsSync(wf.localPath)) {
      isSyncing = false;
      return;
    }
    
    console.log(`[Local ➡️ n8n] [${wf.displayName}] 로컬 파일 변경 감지됨. n8n으로 업데이트 중...`);
    
    // 1. 로컬 파일을 공유 폴더의 임시 경로에 복사
    fs.copyFileSync(wf.localPath, wf.sharedTempPath);
    
    // 2. n8n 컨테이너 내부 CLI로 임포트 실행
    execSync(`docker exec n8n n8n import:workflow --input=${wf.containerTempPath}`, { stdio: 'ignore' });
    
    console.log(`[Local ➡️ n8n] [${wf.displayName}] 동기화 완료.`);
    
    // 임시 파일 정리
    if (fs.existsSync(wf.sharedTempPath)) {
      fs.unlinkSync(wf.sharedTempPath);
    }
    
    // 동기화가 성공했으므로 최종 파일 mtime을 갱신
    wf.lastFileMtime = fs.statSync(wf.localPath).mtimeMs;
  } catch (err) {
    console.error(`[Local ➡️ n8n] [${wf.displayName}] 임포트 실패:`, err.message);
  } finally {
    isSyncing = false;
  }
}

// 주기적인 DB 감시 (3초마다 모든 워크플로우에 대해 실행)
setInterval(() => {
  WORKFLOWS.forEach(wf => syncN8nToLocal(wf));
}, 3000);

// 로컬 파일 변경 감시
WORKFLOWS.forEach(wf => {
  let debounceTimeout = null;
  const fileName = path.basename(wf.localPath);
  fs.watch(path.dirname(wf.localPath), (eventType, filename) => {
    if (filename === fileName) {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (fs.existsSync(wf.localPath)) {
          const currentMtime = fs.statSync(wf.localPath).mtimeMs;
          // 스크립트 자체 업데이트가 아닌 경우에만 동기화
          if (currentMtime > wf.lastFileMtime + 100) {
            syncLocalToN8n(wf);
          }
        }
      }, 500); // 500ms 디바운싱
    }
  });
});
