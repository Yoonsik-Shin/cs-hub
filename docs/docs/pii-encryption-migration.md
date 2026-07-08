---
sidebar_label: PII 암호화 및 마이그레이션 가이드
---

# 고객 개인정보(PII) 암호화 및 마이그레이션 가이드

이 문서는 `customer_inquiries` 테이블에 저장되는 고객 개인정보를 어떻게 암호화하는지, 그리고 평문으로 남아있는 기존 데이터를 새 DB(운영 서버, 다른 환경 등)에서 암호화 전환할 때 무엇을 어떻게 실행해야 하는지를 설명합니다.

---

## 1. 무엇을, 왜 암호화하는가

DB에 저장되는 문의 데이터 중 실제 고객 개인정보(이메일, 전화번호, 문의 본문 등)를 AES-256-GCM으로 암호화해 저장합니다. 반대로 이미 공개된 정보(네이버 카페 게시글/댓글)나 내부 직원 데이터(운영자 정보, IP)는 암호화 대상에서 제외했습니다.

| 필드 | 처리 | 비고 |
|---|---|---|
| `customer_inquiries.content` (문의 본문) | 암호화 | 카드정보·실명·주소 등이 자유텍스트로 섞여 들어올 수 있는 최고 위험 필드 |
| `PhoneMetadata.phoneNumber` / `memo` | 암호화 | 실제 고객 전화번호 + 상담 메모 |
| `GoogleSheetMetadata.contact` | 암호화 | 실제 전화번호 |
| `EmailMetadata.from` (발신자 이메일) | 암호화 + `email_sender_hash`(HMAC-SHA256) 컬럼 병행 | 이메일 스레드 자동 병합 시 이 해시로 정확일치 조회 |
| `userCode`, 네이버카페 작성자/댓글 정보, IP/운영자 정보, `admin_member` 등 | **암호화 안 함** | 내부 식별자·이미 공개된 정보·내부 직원 데이터라 이번 범위에서 제외 |

## 2. 암호화 구조 (코드 상 어디를 보면 되는지)

모든 관련 코드는 `apps/cs-api/src/main/java/com/ttam/cs/infra/security/crypto/` 아래에 있습니다.

- **`PiiEncryptionUtils`**: AES-256-GCM 암/복호화 및 HMAC-SHA256 해시 계산. `PII_ENCRYPTION_SECRET` 환경변수를 키로 사용하며, 네이버 세션 쿠키 암호화 키(`NAVER_SESSION_SECRET`, `EncryptionUtils`)와는 별개입니다.
- **`content` 컬럼**: JPA `AttributeConverter`(`EncryptedStringConverter`)로 저장 시 자동 암호화, 조회 시 자동 복호화됩니다. 별도 코드 수정 없이 항상 적용됩니다.
- **`channel_metadata`(JSONB) 내부 필드**(`phoneNumber`, `memo`, `contact`, `from`): DB 저장 전용 `ObjectMapper`(`PiiAwareObjectMapper`)에 Jackson 믹스인(`PiiJacksonMixins`)을 등록해 암/복호화합니다. **HTTP API 응답에는 이 매퍼를 쓰지 않으므로 평문 그대로 내려갑니다** — 도메인 객체(`PhoneMetadata`, `EmailMetadata` 등) 자체에는 암호화 어노테이션이 없습니다.
- **`email_sender_hash`**: `IntegrateInquiryDataUseCase`/`CreateCustomerInquiryUseCase`가 이메일 생성 시점에 `EmailAddressUtils.normalizeForHash()` + `PiiEncryptionUtils.hmacHex()`로 계산해 채웁니다. 이메일 스레드 병합(`findEmailCandidatesBySender`)이 이 컬럼의 정확일치 조회로 동작합니다.

> ⚠️ **주의**: `CustomerInquiryRepositoryCustomImpl.bulkInsert()`(n8n 웹훅 유입 경로)는 JdbcTemplate으로 직접 INSERT하기 때문에 JPA Converter를 타지 않습니다. 이 경로도 `PiiEncryptionUtils`/`PiiAwareObjectMapper`를 직접 호출해 암호화하도록 구현되어 있습니다 — 새로운 저장 경로를 추가할 때 이 점을 놓치지 않아야 합니다.

## 3. 기존 평문 데이터를 새 DB에서 암호화하기

앱 코드는 **새로 저장되는 데이터만** 자동으로 암호화합니다. 이미 그 DB에 평문으로 쌓여있던 기존 행들은 별도 도구를 한 번 실행해서 암호화해야 합니다.

이 마이그레이션은 앱 기동 경로와 완전히 분리된 **독립 CLI 도구**(`PiiEncryptionMigrationTool`)로 제공됩니다. 앱이 실행 중이든 아니든 상관없이, 필요할 때 딱 한 번 수동으로 실행하는 방식입니다 (앱 시작 시 자동으로 실행되는 로직이 아닙니다).

### 3.1 사전 준비

1. **DB 백업을 먼저 받으세요.** 되돌릴 수 없는 일괄 UPDATE 작업입니다.
2. 마이그레이션을 실행할 때 쓰는 `PII_ENCRYPTION_SECRET` 값이 **그 DB를 실제로 사용하는 cs-api 앱이 쓰는 값과 정확히 일치**해야 합니다. 값이 다르면 그 데이터는 이후 앱에서 영원히 복호화할 수 없습니다.
3. 대상 DB에 Flyway 마이그레이션 `V13__add_email_sender_hash.sql`이 이미 적용되어 `email_sender_hash` 컬럼이 존재해야 합니다. cs-api를 그 DB에 대해 한 번이라도 정상 기동시켰다면 자동으로 적용되어 있습니다.
4. 이 저장소를 마이그레이션 대상 DB와 같은 버전(현재 코드 기준)으로 체크아웃해 두세요.

### 3.2 실행

`apps/cs-api` 디렉토리에서 아래 4개 환경변수를 지정하고 Gradle 태스크를 실행합니다.

```bash
cd apps/cs-api

DB_URL="jdbc:postgresql://<대상DB호스트>:5432/<db이름>" \
DB_USERNAME="<계정>" \
DB_PASSWORD="<비밀번호>" \
PII_ENCRYPTION_SECRET="<그 DB에 연결된 앱이 쓰는 암호화 키>" \
./gradlew piiEncryptionMigration
```

- **같은 서버 안에서 docker-compose로 돌아가는 DB**를 대상으로 할 때: `.env`를 그대로 불러온 뒤 `DB_URL`의 호스트만 실제로 접속 가능한 주소로 바꾸면 됩니다. 예를 들어 호스트 머신(컨테이너 밖)에서 실행한다면 컨테이너 내부 이름(`postgres-db`) 대신, 5432 포트가 호스트에 노출돼 있으므로 `localhost`를 씁니다.

  ```bash
  cd apps/cs-api
  set -a; source ../../.env; set +a
  DB_URL="jdbc:postgresql://localhost:5432/cs_database" ./gradlew piiEncryptionMigration
  ```

- **원격 서버(운영 등)에 직접 접속해서 그 서버 안에서 실행**한다면, 그 서버의 `.env`를 그대로 `source`해서 쓰면 됩니다(호스트 이름이 그 서버의 docker-compose 네트워크 구조에 따라 `postgres-db`로 맞을 수도 있습니다).

### 3.3 실행 결과 확인

콘솔에 아래와 같이 처리 건수가 출력됩니다.

```text
Starting PII encryption migration for customer_inquiries...
PII encryption migration finished. processed=250, updated=240
```

완료 후 다음을 확인하세요.

1. **DB에서 직접 암호문 확인** — `psql`로 `customer_inquiries`를 열어 `content`/`channel_metadata`가 Base64 암호문으로 보이는지 확인합니다.

   ```sql
   SELECT content, channel_metadata FROM customer_inquiries WHERE channel IN ('PHONE','EMAIL') LIMIT 3;
   ```

2. **API 응답에서 평문 확인** — 실제 앱을 통해 조회했을 때 여전히 정상적인 평문으로 보이는지 확인합니다(암호화는 저장 계층에서만 일어나고 API 응답은 그대로 평문입니다).

## 4. 알아두어야 할 것

- **여러 번 실행해도 안전합니다.** `content`는 이미 암호문이면 건너뜁니다. 다만 `channel_metadata`는 AES-GCM 특성상(매 실행마다 새 랜덤 IV 사용) 평문이 동일해도 재실행할 때마다 다른 암호문으로 다시 쓰여집니다 — 데이터가 깨지지는 않지만 완전한 no-op은 아닙니다. 1회성으로 실행하고 끝내는 도구이므로 문제가 되지는 않습니다.
- 이 도구는 Spring 컨텍스트를 띄우지 않는 순수 Java 프로그램입니다(`PiiEncryptionMigrationTool.main()`). cs-api 애플리케이션 코드나 기동 경로에는 이 로직이 전혀 포함되어 있지 않습니다.
- 마이그레이션 대상이 아닌 필드(네이버 카페 작성자/댓글, IP, 운영자 정보 등)는 이 도구가 건드리지 않습니다.
