---
sidebar_label: API URL 정책
---

# API URL 정책

## 기본 원칙

이 프로젝트는 하나의 컴퓨터에 Docker Compose로 배포하고, LAN 내부 사용자에게만 노출합니다. URL은 호출 주체와 성격을 기준으로 나눕니다.

인증/인가와 포트 노출 정책은 `docs/security-policy.md`를 기준으로 관리합니다.

```text
/api/v1/**
  우리 프론트엔드가 호출하는 앱 API입니다.

/webhooks/**
  외부 시스템 callback API입니다.

/docs
  API가 아니라 문서 페이지 진입점입니다.
```

`internal` prefix는 사용하지 않습니다. 현재 앱 API는 모두 우리 프론트엔드에서 호출하고, 외부에서 호출되는 endpoint는 `/webhooks`로 이미 분리되어 있기 때문입니다.

## 앱 API

```text
GET    /api/v1/auth/me
GET    /api/v1/auth/admin-check
POST   /api/v1/auth/admin-tool-access
GET    /api/v1/auth/admin-tool-check
GET    /api/v1/auth/logout

GET    /api/v1/admin/accounts
POST   /api/v1/admin/accounts
DELETE /api/v1/admin/accounts/{username}

POST   /api/v1/naver/sessions
POST   /api/v1/naver/sessions/one-time-login
GET    /api/v1/naver/sessions?id=
POST   /api/v1/naver/sessions/expire?id=
POST   /api/v1/naver/sessions/sync?id=
GET    /api/v1/naver/sessions/status?id=

GET    /api/v1/inquiries/count
GET    /api/v1/inquiries
POST   /api/v1/inquiries
PATCH  /api/v1/inquiries/{id}
PATCH  /api/v1/inquiries/batch/status

POST   /api/v1/inquiries/{id}/work-logs
GET    /api/v1/inquiries/{id}/work-logs
GET    /api/v1/inquiries/{id}/replies

GET    /api/v1/inquiries/bookmarks
POST   /api/v1/inquiries/{id}/bookmark
DELETE /api/v1/inquiries/{id}/bookmark

GET    /api/v1/inquiries/custom-filters
POST   /api/v1/inquiries/custom-filters
DELETE /api/v1/inquiries/custom-filters/{id}

POST   /api/v1/files/presigned-urls
```

### Auth API와 Admin Account API의 차이

`/api/v1/auth/**`는 현재 요청 사용자의 인증 상태와 접근 권한을 확인하는 API입니다. 관리자 계정 리소스를 생성하거나 삭제하지 않습니다.

```text
GET  /api/v1/auth/me          현재 로그인한 관리자 정보 조회
GET  /api/v1/auth/admin-check nginx auth_request용 ADMIN 권한 확인
POST /api/v1/auth/admin-tool-access  어드민 툴 접근용 임시 쿠키 발급
GET  /api/v1/auth/admin-tool-check   nginx auth_request용 어드민 툴 접근 쿠키 검증
GET  /api/v1/auth/logout      Basic Auth 계정 전환을 위한 401 challenge
```

`/api/v1/admin/accounts/**`는 로그인 가능한 관리자/운영자 계정 자체를 관리하는 API입니다. DB의 `admin_member`와 nginx Basic Auth용 `.htpasswd`를 함께 갱신합니다.

```text
GET    /api/v1/admin/accounts            관리자/운영자 계정 목록 조회
POST   /api/v1/admin/accounts            관리자/운영자 계정 생성
DELETE /api/v1/admin/accounts/{username} 관리자/운영자 계정 삭제
```

어드민 툴 접근은 일반 앱 API 인증과 별도의 게이트를 둡니다.

```text
1. ADMIN 사용자가 프론트에서 어드민 툴(n8n, Grafana 등) 접근을 요청
2. POST /api/v1/auth/admin-tool-access 호출
3. backend가 ADMIN 역할을 확인하고 cs_admin_access 쿠키 발급
4. 브라우저가 어드민 툴 경로(/n8n/, /grafana/ 등) 접근
5. nginx가 GET /api/v1/auth/admin-tool-check를 auth_request로 호출
6. backend가 cs_admin_access 쿠키를 검증
7. 유효하면 nginx가 해당 툴로 프록시 허용
```

앱 API의 controller와 request/response DTO는 URL 버전에 맞춰 패키지를 분리합니다.

```text
feature/auth/api/v1/controller
feature/auth/api/v1/dto

feature/inquiry/api/http/v1/controller
feature/inquiry/api/http/v1/dto

feature/file/api/v1/controller
feature/file/usecase
```

`v2`가 필요한 경우 기존 `v1` controller와 DTO를 유지하고, `api/v2` 패키지에 새 계약을 추가합니다. usecase, domain, repository는 API 계약 버전에 종속되지 않으므로 버전 패키지로 나누지 않습니다.

controller는 repository처럼 aggregate root 기준을 강하게 따르지 않습니다. HTTP 요청 책임, 화면/기능 단위, request/response 계약의 응집도를 기준으로 분리합니다.

```text
CustomerInquiryController  -> 문의 목록, 생성, 상태/필드 변경, 회신 조회
InquiryWorkLogController   -> 특정 문의의 작업 로그 등록/조회
BookmarkController         -> 문의 북마크 등록/삭제/조회
CustomFilterController     -> 문의 검색 필터 저장/삭제/조회
```

하위 객체라도 독립적인 API 흐름, 별도 request/response, 별도 권한/문서화 필요성이 있으면 controller를 분리합니다. 반대로 repository는 aggregate의 일관성 경계를 기준으로 두기 때문에 하위 객체별 repository를 무조건 만들지 않습니다.

UseCase는 서비스처럼 기능 묶음으로 만들지 않고 하나의 요청 또는 사용자 의도 단위로 분리합니다.

```text
CreateCustomerInquiryUseCase
SearchCustomerInquiriesUseCase
UpdateInquiryStatusUseCase
BatchUpdateInquiryStatusUseCase
AddInquiryBookmarkUseCase
RemoveInquiryBookmarkUseCase
```

여러 요청을 묶는 `CustomerInquiryUseCase`, `BookmarkUseCase`, `CustomFilterUseCase` 같은 이름은 사용하지 않습니다.

Typed n8n workflow payload DTO는 프론트엔드 HTTP API 계약이 아니므로 `api/http/v1/dto`에 두지 않습니다.

```text
infra/webhooks/handler/n8n/workflow/dto
```

n8n workflow handler는 workflow payload를 해석하고 애플리케이션 이벤트를 발행합니다. 실제 문의 처리 usecase 호출은 feature inquiry의 event listener가 담당합니다.

## 파일 API

파일 업로드 URL 발급은 `/api/v1/files` 아래에 둡니다.

이 API는 이미지 전용이 아닙니다. 현재 구현은 `objectNames`, `contentType`을 받아 S3/MinIO presigned URL을 발급하는 범용 파일 업로드 기능입니다. 그래서 `images`나 `attachments`보다 `files`가 더 정확합니다.

단건 API는 두지 않고 batch API 하나로 통일합니다. 파일이 하나인 경우에도 `objectNames`에 하나만 담아 `/api/v1/files/presigned-urls`를 호출합니다.

파일 업로드 URL 발급은 문의 aggregate에 종속된 기능이 아니므로 `feature/inquiry`가 아니라 `feature/file`에 둡니다. S3/MinIO presigned URL 생성 자체는 기술 구현이므로 `infra/storage`의 `StorageService`가 담당하고, `feature/file`은 애플리케이션 API와 usecase만 담당합니다.

## 웹훅

```text
POST /webhooks/n8n
POST /webhooks/kakao/skills
POST /webhooks/kakao/validation/user-code
```

웹훅에는 `/api` prefix를 붙이지 않습니다. 프론트엔드가 호출하는 앱 API가 아니라 외부 시스템이 호출하는 callback endpoint이기 때문입니다.

웹훅 버전은 일반 앱 API처럼 일괄 prefix로 관리하지 않습니다. 외부 계약이 깨지는 변경이 생기면 새 endpoint를 추가합니다.

```text
/webhooks/kakao/skills
/webhooks/kakao/v2/skills
```

## Kakao Webhook 운영 제약

현재 배포 방식은 LAN 내부 접근만 허용합니다. 따라서 카카오 서버는 이 서비스의 LAN IP로 직접 접근할 수 없습니다.

카카오 webhook endpoint는 개발/테스트 및 향후 외부 공개 배포를 대비해 유지합니다. 로컬 테스트가 필요하면 ngrok 같은 임시 터널을 사용합니다.

```text
Kakao server
  -> public tunnel URL
  -> local Docker Compose
  -> /webhooks/kakao/**
```

## API 문서

```text
GET /docs
```

`/docs`는 API가 아니라 문서 페이지 redirect입니다. 그래서 `/api` prefix를 붙이지 않습니다.
