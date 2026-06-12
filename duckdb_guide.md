# DuckDB를 사용하여 MinIO OpenTelemetry 웹훅 로그 분석하기

MinIO 오브젝트 스토리지에 **OpenTelemetry(OTel) 표준 규격**으로 적재된 카카오 챗봇 웹훅 JSON 로그 데이터를 **DuckDB**를 활용해 표준 SQL로 직접 조회하고 분석할 수 있습니다.

현재 로그는 아래와 같이 OTel 표준 데이터 모델로 저장되어 있습니다:
```json
{
  "timestamp": "2026-06-09T04:37:33Z",
  "severityText": "INFO",
  "severityNumber": 9,
  "resource": {
    "service.name": "cs-api",
    "service.version": "0.0.1-SNAPSHOT"
  },
  "attributes": {
    "log.type": "skill"
  },
  "body": {
    "bot": { "id": "...", "name": "테스트봇" },
    "action": { "name": "test_skill", "params": { "challenge_name": "모닝런", "user_code": "123456789123" } }
  }
}
```

---

## 1. 사전 준비

### DuckDB 설치 및 준비
분석하고자 하는 환경(로컬 PC)에서 DuckDB CLI 또는 Python/Node.js 라이브러리를 준비합니다.
* **DuckDB CLI 설치 (Windows):** `winget install DuckDB.Cli`

---

## 2. DuckDB 연동 및 설정

DuckDB를 실행한 후, S3 호환 스토리지인 MinIO에 연결하기 위해 아래 SQL 커맨드를 입력하여 `httpfs` 익스텐션을 설치하고 연동 자격 증명을 설정합니다.

```sql
-- 1. S3/HTTP 연동용 HTTPFS 익스텐션 설치 및 로드
INSTALL httpfs;
LOAD httpfs;

-- 2. 로컬 MinIO(S3) 접속 정보 설정
SET s3_endpoint='localhost:9000';
SET s3_access_key_id='minioadmin';
SET s3_secret_access_key='minioadminpassword';
SET s3_use_ssl=false;
SET s3_url_style='path';
```

---

## 3. SQL로 로그 데이터 분석 및 조회

이제 `read_json_auto()` 함수를 활용하여 OTel 스키마에 맞춰 데이터를 쿼리할 수 있습니다. 카카오 원본 데이터는 **`body` 필드 하위**에 위치합니다.

### 3.1. 수집된 스킬 로그 전체 확인
```sql
SELECT 
    timestamp,
    severityText,
    resource."service.name" AS service_name,
    attributes."log.type" AS log_type,
    body
FROM read_json_auto('s3://kakao-webhook-logs/type=skill/**/*.json');
```

### 3.2. 챗봇 사용자들이 어떤 발화(Utterance)를 많이 했는지 집계 (`body.userRequest.utterance` 참조)
```sql
SELECT 
    body.userRequest.utterance AS user_utterance, 
    COUNT(*) as request_count
FROM read_json_auto('s3://kakao-webhook-logs/type=skill/**/*.json')
GROUP BY user_utterance
ORDER BY request_count DESC;
```

### 3.3. 특정 일자(예: 2026년 06월 09일)에 들어온 로그만 분석 (Hive 파티션 필터 활용)
DuckDB는 경로 상의 `year=xxxx`, `month=xx`, `day=xx` 등 폴더 경로 구조를 **파티션 컬럼**으로 자동 인식합니다.

```sql
SELECT 
    timestamp,
    body.action.params.user_code AS user_code,
    body.action.params.challenge_name AS challenge_name
FROM read_json_auto('s3://kakao-webhook-logs/type=skill/**/*.json', hive_partitioning=true)
WHERE year = '2026' AND month = '06' AND day = '09';
```

### 3.4. 파라미터 검증(Validation) 실패한 로그 및 원본값 통계 (`body.value.origin` 참조)
```sql
-- 검증 API 요청 로그에서 유효하지 않은 유저 코드 입력값 분석
SELECT 
    timestamp,
    body.value.origin AS raw_input,
    body.user.id AS user_id
FROM read_json_auto('s3://kakao-webhook-logs/type=validation/**/*.json')
-- 12자리 숫자가 아닌 실패 패턴만 골라보기
WHERE body.value.origin NOT SIMILAR TO '[0-9]{12}';
```
