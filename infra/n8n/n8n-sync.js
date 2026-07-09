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
      content: stableStringify(toComparableWorkflow(obj))
    };
  } catch (e) {
    return null;
  }
}

function toComparableWorkflow(obj) {
  return {
    id: obj.id,
    name: obj.name,
    description: obj.description ?? null,
    active: Boolean(obj.active),
    isArchived: Boolean(obj.isArchived),
    nodes: obj.nodes || [],
    connections: obj.connections || {},
    settings: obj.settings || {},
    tags: obj.tags || []
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function updatedAtMs(norm) {
  if (!norm || !norm.updatedAt) return null;

  const parsed = Date.parse(norm.updatedAt);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareUpdatedAt(leftNorm, rightNorm) {
  const left = updatedAtMs(leftNorm);
  const right = updatedAtMs(rightNorm);

  if (left !== null && right !== null) {
    return left === right ? 0 : left > right ? 1 : -1;
  }

  if (left !== null) return 1;
  if (right !== null) return -1;
  return 0;
}

function formatWorkflowJson(raw) {
  return JSON.stringify(JSON.parse(raw), null, 2);
}

function mergeRuntimeMetadata(localRaw, exportedRaw) {
  if (!exportedRaw) return localRaw;

  const localParsed = JSON.parse(localRaw);
  const exportedParsed = JSON.parse(exportedRaw);
  const localObj = Array.isArray(localParsed) ? localParsed[0] : localParsed;
  const exportedObj = Array.isArray(exportedParsed) ? exportedParsed[0] : exportedParsed;

  if (!localObj || !exportedObj) return localRaw;

  const mergedObj = {
    ...localObj,
    staticData: exportedObj.staticData,
    triggerCount: exportedObj.triggerCount,
    shared: exportedObj.shared,
    createdAt: exportedObj.createdAt || localObj.createdAt
  };

  const merged = Array.isArray(localParsed) ? [mergedObj] : mergedObj;
  return JSON.stringify(merged, null, 2);
}

function readLocalWorkflow(wf) {
  if (!fs.existsSync(wf.localPath)) return null;

  const raw = fs.readFileSync(wf.localPath, 'utf8');
  return {
    raw,
    norm: normalizeJson(raw)
  };
}

function exportN8nWorkflow(wf) {
  execSync(`docker exec n8n n8n export:workflow --id=${wf.id} --output=${wf.containerTempPath}`, { stdio: 'ignore' });

  if (!fs.existsSync(wf.sharedTempPath)) return null;

  const raw = fs.readFileSync(wf.sharedTempPath, 'utf8');
  return {
    raw,
    norm: normalizeJson(raw)
  };
}

function cleanupSharedTemp(wf) {
  if (fs.existsSync(wf.sharedTempPath)) {
    fs.unlinkSync(wf.sharedTempPath);
  }
}

function writeLocalWorkflow(wf, raw) {
  fs.writeFileSync(wf.localPath, formatWorkflowJson(raw), 'utf8');
  wf.lastFileMtime = fs.statSync(wf.localPath).mtimeMs;
}

function importLocalWorkflow(wf, localRaw, exportedRaw = null) {
  fs.writeFileSync(wf.sharedTempPath, mergeRuntimeMetadata(localRaw, exportedRaw), 'utf8');
  execSync(`docker exec n8n n8n import:workflow --input=${wf.containerTempPath}`, { stdio: 'ignore' });
  wf.lastFileMtime = fs.statSync(wf.localPath).mtimeMs;
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
    const exported = exportN8nWorkflow(wf);
    if (!exported || !exported.norm) return;

    const local = readLocalWorkflow(wf);
    if (!local) {
      console.log(`[n8n ➡️ Local] [${wf.displayName}] 로컬 파일이 없어 n8n 기준으로 생성합니다.`);
      writeLocalWorkflow(wf, exported.raw);
      console.log(`[n8n ➡️ Local] [${wf.displayName}] 동기화 완료.`);
      return;
    }

    if (!local.norm || exported.norm.content === local.norm.content) {
      return;
    }

    const compareResult = compareUpdatedAt(exported.norm, local.norm);

    if (compareResult > 0) {
      console.log(`[n8n ➡️ Local] [${wf.displayName}] n8n workflow가 더 최신입니다. 로컬 파일 업데이트 중...`);
      writeLocalWorkflow(wf, exported.raw);
      console.log(`[n8n ➡️ Local] [${wf.displayName}] 동기화 완료.`);
    } else if (compareResult < 0) {
      console.log(`[Local ➡️ n8n] [${wf.displayName}] 로컬 workflow가 더 최신입니다. n8n으로 업데이트 중...`);
      importLocalWorkflow(wf, local.raw, exported.raw);
      console.log(`[Local ➡️ n8n] [${wf.displayName}] 동기화 완료.`);
    } else {
      console.log(`[n8n-sync] [${wf.displayName}] updatedAt이 같지만 설정 내용이 다릅니다. 자동 덮어쓰기를 보류합니다.`);
    }
  } catch (err) {
    // n8n 내부에 해당 ID의 워크플로우가 아직 등록되지 않은 경우 등
    // 에러를 조용히 넘김 (초기 로딩 시점 대응)
  } finally {
    cleanupSharedTemp(wf);
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
    const local = readLocalWorkflow(wf);
    if (!local || !local.norm) return;

    const exported = exportN8nWorkflow(wf);
    if (exported && exported.norm) {
      if (exported.norm.content === local.norm.content) {
        wf.lastFileMtime = fs.statSync(wf.localPath).mtimeMs;
        return;
      }

      const compareResult = compareUpdatedAt(local.norm, exported.norm);
      if (compareResult < 0) {
        console.log(`[Local ➡️ n8n] [${wf.displayName}] 로컬 workflow가 n8n보다 오래되어 import를 건너뜁니다.`);
        writeLocalWorkflow(wf, exported.raw);
        return;
      }
    }

    console.log(`[Local ➡️ n8n] [${wf.displayName}] 로컬 workflow가 최신입니다. n8n으로 업데이트 중...`);
    cleanupSharedTemp(wf);
    importLocalWorkflow(wf, local.raw, exported ? exported.raw : null);
    console.log(`[Local ➡️ n8n] [${wf.displayName}] 동기화 완료.`);
  } catch (err) {
    console.error(`[Local ➡️ n8n] [${wf.displayName}] 임포트 실패:`, err.message);
  } finally {
    cleanupSharedTemp(wf);
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
