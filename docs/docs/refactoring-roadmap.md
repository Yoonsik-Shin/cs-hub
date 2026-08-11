---
sidebar_label: 포트폴리오 리팩터링 로드맵
---

# 포트폴리오 리팩터링 로드맵

## 목적

이 작업의 목적은 기능을 추가하는 것이 아니다. 저장소를 처음 방문한 사람이 README에서 문제와 설계 판단을 이해하고, 대표 코드와 테스트를 자연스럽게 따라가며 그 설명을 검증할 수 있도록 코드와 문서를 재구성한다.

다음 원칙을 작업 기준으로 사용한다.

- 동작을 테스트로 고정한 뒤 구조를 변경한다.
- 파일을 작게 만드는 것보다 변경 이유와 책임을 분명하게 만든다.
- README의 설명은 현재 코드와 자동 검증으로 증명할 수 있어야 한다.
- 정상 흐름뿐 아니라 중복 실행, 외부 서비스 실패, 세션 만료와 같은 운영 예외를 함께 보여준다.
- 리팩터링, 테스트, 문서 변경을 리뷰 가능한 커밋 단위로 분리한다.

## 2026-08-11 기준선

| 검증 항목 | 결과 | 비고 |
| --- | --- | --- |
| 백엔드 테스트 | 통과 | 테스트 클래스 3개, 테스트 8개 |
| 프론트엔드 프로덕션 빌드 | 통과 | TypeScript compile 및 Vite build 통과 |
| 프론트엔드 lint | 실패 | 오류 58개, 경고 2개 |
| browser-worker 테스트 | 실행 불가 | 테스트 스크립트와 테스트 코드 없음 |
| Docker Compose 설정 | 유효 | `N8N_HOST` 미설정 경고 있음 |
| 로컬 서비스 | 미실행 | 기준선 확인 당시 실행 중인 서비스 없음 |
| Gradle Wrapper | 없음 | 시스템 Gradle 의존으로 재현성이 부족함 |

프론트엔드 lint 실패는 이번 리팩터링에서 새로 만든 회귀가 아니다. 기존 기준선의 부채로 기록하고, 의미 단위별 커밋에서 점진적으로 제거한다.

## 우선순위가 높은 구조적 부채

### 1. 프론트엔드 책임 집중

- `App.tsx`: 2,446줄
- `InquiryDetailPanel.tsx`: 2,964줄
- `FilterBar.tsx`: 1,103줄
- `AccountManagementModal.tsx`: 728줄
- `CreateTicketModal.tsx`: 660줄
- `inquiryApi.ts`: 645줄

화면 렌더링, 서버 상태, 페이지 캐시, 자동 갱신, 일괄 선택, 사용자 설정 저장과 오류 처리가 대형 컴포넌트에 함께 있다. 기능별 hook과 순수 정책 함수, 표현 컴포넌트로 분리하되 사용자 행동은 테스트로 먼저 고정한다.

### 2. 문의 통합 유스케이스의 다중 책임

`IntegrateInquiryDataUseCase`가 다음 규칙을 함께 처리한다.

- 관리자 발신 이메일 제외
- 채널별 입력 검증
- 첨부파일 경로 정규화
- 이메일 바로가기 생성
- 문의 생성과 고유키 계산
- 이메일 부모 스레드 탐색
- 완료 문의 자동 재오픈
- 시스템 작업 이력 생성
- 이메일 발신자 검색용 HMAC 생성
- bulk insert orchestration

먼저 회귀 테스트를 보강한 뒤, 입력 검증·이메일 스레드·자동 재오픈처럼 독립적인 업무 규칙만 분리한다. 클래스 개수를 늘리는 것 자체는 목표가 아니다.

### 3. 검증 자동화의 불균형

백엔드는 문의 통합 경로에 일부 테스트가 있지만 인증, PII 암호화, 작업 이력과 배치 처리의 자동 검증이 부족하다. 프론트엔드와 browser-worker에는 자동화 테스트가 없다. 공개 저장소에서 강조할 대표 시나리오부터 테스트를 추가한다.

### 4. 실행 재현성

Gradle Wrapper가 없어 로컬에 설치된 Gradle 버전과 환경에 의존한다. 루트에서 백엔드 테스트, 프론트 lint/build, Compose 설정 검증을 일관되게 실행할 진입점도 없다.

### 5. README와 코드 탐색의 단절

현재 README는 시스템 구성과 실행 방법을 설명하지만 설계 판단을 검증할 대표 코드·테스트로 이어지는 탐색 경로가 없다. 리팩터링이 안정화된 뒤 실제 GitHub 링크를 사용하는 guided code tour로 재작성한다.

## 대표 코드 투어 시나리오

README에서 다음 순서로 코드를 탐색할 수 있도록 만든다.

1. 멀티채널 문의 수집과 고유키 기반 중복 방지
2. 이메일 회신 스레드 연결과 완료 문의 자동 재오픈
3. AES-GCM 기반 PII 저장 암호화와 HMAC 검색 보조값
4. Nginx, DB 기반 RBAC, 내부 토큰으로 구성한 신뢰 경계
5. n8n 트리거별 Lock과 공통 오류 처리
6. 커서 페이지네이션, 일괄 처리와 자동 갱신 중 사용자 맥락 유지

각 코드 투어는 문제, 제약, 선택, 대안, 코드, 테스트, 감수한 단점 순으로 설명한다.

## 작업 단계와 완료 조건

### Milestone 1. 기준선과 개발 도구

- [x] 전용 브랜치 생성
- [x] 기존 빌드와 테스트 결과 기록
- [ ] Gradle Wrapper 추가
- [ ] 통합 검증 명령 제공
- [ ] 공개 저장소 민감정보 및 생성물 점검

완료 조건: 새로운 환경에서 문서에 적힌 명령으로 동일한 검증을 실행할 수 있다.

### Milestone 2. 백엔드 대표 코드

- [ ] 문의 통합과 이메일 스레드 회귀 테스트 보강
- [ ] 시간과 시스템 작업자 하드코딩 제거
- [ ] 입력 검증과 이메일 스레드 규칙 분리
- [ ] 업무 오류를 명시적인 타입으로 표현
- [ ] PII 암호화 및 인증 경계 테스트 추가

완료 조건: 대표 업무 규칙이 클래스 이름과 테스트 이름만으로 읽히며 모든 테스트가 통과한다.

### Milestone 3. 프론트엔드 대표 코드

- [ ] 목록 조회, 페이지 캐시, 자동 갱신 로직 분리
- [ ] 일괄 선택 정책을 순수 함수로 분리
- [ ] 선택한 상세 문의 유지 로직 테스트
- [ ] 이미지 뷰어와 상세 타임라인 분리
- [ ] 기존 lint 오류 제거

완료 조건: lint와 build가 통과하고 대형 컴포넌트가 업무 흐름별로 탐색 가능하다.

### Milestone 4. 문서와 README

- [ ] 핵심 설계 결정 ADR 작성
- [ ] 대표 시나리오 code tour 작성
- [ ] README를 문제 → 설계 판단 → 코드 → 테스트 흐름으로 재작성
- [ ] 아키텍처 문서와 현재 코드 일치 여부 검증

완료 조건: README에서 5분 안에 대표 코드와 그 테스트까지 이동할 수 있다.

### Milestone 5. 실행 화면과 최종 검증

- [ ] 전체 Docker Compose 환경 실행
- [ ] 대표 업무 흐름 수동 검증
- [ ] 데스크톱 및 좁은 화면 스크린샷 촬영
- [ ] README 이미지 최적화 및 대체 텍스트 작성
- [ ] 깨진 링크, Mermaid, 실행 명령 최종 확인

완료 조건: 새 checkout에서 실행과 검증을 재현할 수 있고 README의 화면이 실제 현재 구현과 일치한다.

## 브랜치와 커밋 전략

작업 브랜치는 `refactor/portfolio-readiness`를 사용한다. 커밋은 다음 규칙을 따른다.

- 한 커밋에는 하나의 설명 가능한 의도만 담는다.
- 동작 고정 테스트와 리팩터링을 가능하면 별도 커밋으로 나눈다.
- 파일 이동과 로직 변경을 같은 커밋에 섞지 않는다.
- 기계적인 format 변경과 의미 변경을 분리한다.
- 문서는 해당 코드가 안정화된 뒤 실제 경로를 기준으로 작성한다.
- 각 커밋 후 관련 테스트를 실행하고 결과를 커밋 메시지 또는 작업 기록에 남긴다.

예상 커밋 흐름은 다음과 같다.

```text
docs: record portfolio refactoring baseline
build: add reproducible verification entrypoints
test: characterize inquiry integration behavior
refactor: isolate email thread resolution policy
test: cover PII encryption boundaries
refactor: clarify PII persistence boundary
test: characterize inquiry workspace state
refactor: extract inquiry workspace hooks
docs: add architecture decisions and code tours
docs: rebuild README around guided code navigation
docs: add verified application screenshots
```

## 스크린샷 원칙

스크린샷은 장식이 아니라 구현 결과의 증거로 사용한다.

- README 상단에는 제품 전체 화면 1장만 사용한다.
- 세부 화면은 code tour 또는 기능 설명 가까이에 둔다.
- 운영 데이터 대신 mock data를 사용한다.
- 개인정보, 계정명, 토큰, 내부 URL이 노출되지 않는지 확인한다.
- 동일한 viewport와 데이터 상태로 다시 촬영할 수 있게 절차를 기록한다.
- 데스크톱 전체 업무 화면과 좁은 viewport 대응 화면을 각각 검증한다.
