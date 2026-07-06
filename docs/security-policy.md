# Security Policy

## 배포 전제

이 서비스는 하나의 컴퓨터에서 Docker Compose로 실행하고, LAN 내부 사용자에게만 노출합니다.

외부에 공개되는 기본 진입점은 frontend nginx입니다.

```text
LAN user
  -> frontend nginx:8888
  -> cs-api:8080
```

`cs-api`는 host port를 열지 않습니다. 외부 사용자는 backend에 직접 접근하지 않고 nginx를 통해서만 접근합니다.

## 사용자 API 인증

사용자가 호출하는 앱 API는 `/api/**`입니다.

```text
Browser
  -> nginx Basic Auth
  -> proxy_set_header X-Remote-User $remote_user
  -> Spring Security
  -> NginxHeaderAuthFilter
  -> admin_member 조회
```

`X-Remote-User`는 클라이언트가 직접 신뢰 값으로 보내는 인증 토큰이 아닙니다. nginx가 Basic Auth 인증 성공 후 backend로 전달하는 인증 결과 헤더입니다.

Spring backend는 `/api/**` 요청에 대해 다음을 강제합니다.

```text
X-Remote-User 없음 + X-Internal-Token 없음        -> 401
X-Remote-User 있음 + admin_member 미등록 사용자    -> 401
X-Remote-User 있음 + admin_member 등록 사용자      -> Spring Security 관리자 인증 객체 생성
X-Internal-Token 일치                              -> Spring Security 내부 시스템 인증 객체 생성
```

관리자 전용 기능은 `@RequireRoles(AdminRole.ADMIN)`으로 추가 권한을 확인합니다.

프론트와 n8n이 함께 사용하는 API는 endpoint를 분리하지 않고 인증 방식만 다르게 허용합니다.

```text
프론트 호출 -> nginx Basic Auth -> X-Remote-User
n8n 호출   -> X-Internal-Token
```

내부 토큰 인증은 `ROLE_SYSTEM`으로만 인증되므로 `@RequireRoles(AdminRole.ADMIN)`이 필요한 관리자 기능은 호출할 수 없습니다.

## 어드민 툴 접근 제어

n8n UI, Grafana, MinIO 등의 어드민 툴은 nginx가 프록시합니다. 직접 Basic Auth를 다시 요구하지 않고 backend의 auth API로 접근 가능 여부를 확인합니다.

```text
ADMIN 사용자
  -> POST /api/v1/auth/admin-tool-access
  -> backend가 cs_admin_access 쿠키 발급
  -> 어드민 툴 경로(/n8n/, /grafana/ 등) 접근
  -> nginx auth_request /_admin_tool_auth
  -> GET /api/v1/auth/admin-tool-check
  -> 쿠키 유효 시 프록시 허용
```

`/api/v1/auth/admin-tool-access`는 `@RequireRoles(AdminRole.ADMIN)`이 필요합니다. `/api/v1/auth/admin-tool-check`는 사용자가 직접 쓰는 API가 아니라 nginx `auth_request`에서 호출하는 쿠키 검증 API입니다.

## 내부 서비스 인증

`INTERNAL_API_TOKEN`은 사용자 로그인 토큰이 아닙니다. Docker 내부 서비스 간 호출을 보호하기 위한 shared secret입니다.

```text
cs-api
  -> browser-worker
  -> X-Internal-Token: ${INTERNAL_API_TOKEN}
```

`browser-worker`는 host port를 열지 않고 Docker 내부 네트워크에서만 접근합니다.

내부 토큰으로 보호되는 backend endpoint는 `@RequireInternalAuth`를 사용합니다.

```text
X-Internal-Token 없음 또는 불일치 -> 401
X-Internal-Token 일치            -> 요청 처리
```

## Webhook 인증

### n8n

n8n은 같은 Docker Compose 네트워크 내부에서 backend를 호출합니다.

```text
n8n
  -> /webhooks/n8n
  -> X-Internal-Token 필수
```

`/webhooks/n8n`은 `@RequireInternalAuth`로 보호합니다.

### Kakao

현재 운영 방식은 LAN 내부 접근만 허용하므로 카카오 서버는 이 서비스의 LAN IP로 직접 접근할 수 없습니다.

카카오 webhook endpoint는 개발/테스트 및 향후 외부 공개 배포를 대비해 유지합니다. 로컬 테스트가 필요하면 ngrok 같은 임시 터널을 사용합니다.

```text
Kakao server
  -> public tunnel URL
  -> local Docker Compose
  -> /webhooks/kakao/**
```

## 포트 노출 원칙

```text
frontend nginx: host port 공개
cs-api: host port 공개 금지
browser-worker: host port 공개 금지
postgres/minio/grafana: 운영 필요성에 따라 별도 판단
```

`cs-api` 또는 `browser-worker`에 host `ports`를 추가하면 nginx 인증 경계를 우회할 수 있으므로 운영 compose에서는 금지합니다.
