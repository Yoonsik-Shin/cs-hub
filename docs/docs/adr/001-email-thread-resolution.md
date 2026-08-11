---
sidebar_label: ADR-001 이메일 스레드 연결
---

# ADR-001. 이메일 회신 스레드 연결 순서

- 상태: 채택
- 결정일: 2026-08-11

## 배경

외부 메일 수집기가 전달하는 데이터에는 `In-Reply-To`, `References`, IMAP UID, 제목과 발신자가 포함될 수 있다. 모든 메일 서버와 클라이언트가 동일한 헤더를 보존하지 않으므로 하나의 필드만으로 부모 문의를 찾으면 회신이 새 문의로 분리될 수 있다.

반대로 제목만으로 연결하면 서로 다른 고객의 같은 제목 문의를 합칠 위험이 있다. PII 원문을 검색 컬럼에 저장하지 않는다는 제약도 함께 지켜야 한다.

## 결정

부모 문의는 신뢰도가 높은 정보부터 다음 순서로 찾는다.

1. `In-Reply-To`의 message-id
2. `References`에 기록된 message-id를 헤더 순서대로 조회
3. 최근 7일 이내의 발신자 HMAC과 정규화한 제목

조회된 문의가 이미 자식이면 그 문의의 `parentId`를 사용해 모든 회신을 최초 문의 아래에 평탄화한다. 제목 fallback은 `Re:`, `Fw:`, `Fwd:`, `회신:` 접두사를 반복 제거한 뒤 비교한다.

완료된 부모에 새 회신이 들어온 경우에만 `OPEN`으로 바꾸고 시스템 작업 이력을 남긴다. 이미 `OPEN` 또는 `IN_PROGRESS`인 문의는 상태와 이력을 변경하지 않는다.

## 검토한 대안

### 제목만으로 연결

헤더가 없는 메일도 연결할 수 있지만 동명이 문의와 자동 발송 메일을 잘못 합칠 위험이 커서 채택하지 않았다.

### IMAP UID를 스레드 식별자로 사용

UID는 메일함 내 메시지 식별자이며 회신 관계를 표현하지 않는다. 웹메일 바로가기와 수집 중복 방지에는 사용할 수 있지만 부모 탐색 기준으로는 사용하지 않는다.

### 모든 회신을 직전 회신의 자식으로 연결

메일 구조를 그대로 표현할 수 있지만 운영 화면에서 깊이가 계속 늘어난다. CS 처리 단위는 최초 문의이므로 root ID로 평탄화했다.

## 결과와 한계

- 명시적 헤더가 있으면 제목 fallback보다 우선하므로 오연결 가능성이 낮다.
- 발신자 fallback 검색은 원문 대신 HMAC을 사용한다.
- 7일 lookback은 오래된 회신의 자동 연결을 포기하는 대신 같은 제목의 장기 오연결을 줄인다.
- `Clock`을 주입해 기간 경계 테스트를 결정적으로 실행할 수 있다.

## 코드와 검증

- [EmailThreadResolver](../../../apps/cs-api/src/main/java/com/ttam/cs/feature/inquiry/usecase/EmailThreadResolver.java)
- [ResolvedInquiryReopener](../../../apps/cs-api/src/main/java/com/ttam/cs/feature/inquiry/usecase/ResolvedInquiryReopener.java)
- [EmailThreadResolverTest](../../../apps/cs-api/src/test/java/com/ttam/cs/feature/inquiry/usecase/EmailThreadResolverTest.java)
- [ResolvedInquiryReopenerTest](../../../apps/cs-api/src/test/java/com/ttam/cs/feature/inquiry/usecase/ResolvedInquiryReopenerTest.java)
