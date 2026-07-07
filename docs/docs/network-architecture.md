---
sidebar_label: 네트워크 아키텍처
---

# 네트워크 아키텍처 (Network Architecture)

이 문서는 CS 테스트베드 시스템 내부 컨테이너 통신망(Docker Bridge Network) 구조와 단일 호스트 인그레스 차단 원칙, 그리고 Nginx 리버스 프록시를 통한 IP 대역별 인바운드 통제 설정을 정의합니다.

---

## 🌐 1. Docker 브릿지 네트워크 (`n8n_network`)

시스템의 모든 컨테이너 서비스는 Docker 엔진이 제공하는 독립 브릿지 네트워크인 `n8n_network`에 가입되어 상호 통신을 수행합니다.

* **Docker 내부 DNS 분석**: 컨테이너들은 호스트의 실제 IP나 동적 포트 매핑 상태를 몰라도, 컨테이너 서비스 이름(예: `cs-api`, `postgres-db`, `minio`, `n8n` 등)을 호스트명으로 사용하여 1:1 사설 통신을 수행합니다.
  * *예시*: `browser-worker` 서비스에서 백엔드로 연결 시 `http://cs-api:8080` 주소로 즉시 라우팅됩니다.
* **격리 효과**: 호스트 네트워크 카드나 공인 인터넷 인터페이스와 직접 결합하지 않고 내부 가상 브릿지를 사용하므로, 스니핑 및 외부 해킹 위협으로부터 DB 및 백그라운드 태스크 엔진을 안전하게 격리합니다.

---

## 🔒 2. 호스트 포트 노출 제한 원칙

외부 침투 경로를 원천 차단하기 위해 **외부 인그레스 포트(Ingress Port) 노출 최소화** 원칙을 고수합니다.

```text
                  [ 인터넷 / LAN 환경 ]
                            │
                      (포트 8888만 허용)
                            ▼
              ┌───────────────────────────┐
              │    cs-frontend-nginx      │ (Nginx 리버스 프록시)
              └─────────────┬─────────────┘
                            │
               [ n8n_network 내부 네트워크 ]
                            │ (포트 미공개 상태로 격리 통신)
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
     cs-api           browser-worker          grafana
    (8080)               (3000)               (3000)
```

### 컨테이너 포트 노출 현황

* **포트 노출 대상 (Host Binding)**:
  * `cs-frontend-nginx` (`8888:80`): 사용자가 서비스 콘솔에 접근하기 위한 유일한 공인 게이트웨이.
  * `postgres-db` (`5432:5432`): 개발자의 DBeaver 등 DB 툴 접속 편의를 위한 개발용 바인딩.
  * `minio` (`9000:9000`, `9001:9001`): 외부 S3 연동 테스트 및 관리용 로컬 포트 바인딩.
* **포트 노출 차단 대상 (Internal Only)**:
  * `cs-api` (백엔드): 외부 포트 미노출. 포트 8080은 Docker 내부망에서만 사용 가능합니다.
  * `browser-worker` (자동화 워커): 외부 포트 미노출. 포트 3000은 백엔드의 API 요청 수신 용도로 격리됩니다.
  * `n8n` (워크플로우): 외부 포트 미노출. 포트 5678 접근은 Nginx 어드민 로그인 후에만 포워딩됩니다.
  * `grafana` (모니터링): 외부 포트 미노출. 포트 3000 접근 역시 Nginx 리버스 프록시 검증 후에 연결됩니다.

---

## 🚦 3. Nginx 리버스 프록시 라우팅 테이블

호스트의 단일 진입점인 `8888` 포트를 타고 들어온 요청은 Nginx(`infra/nginx/nginx.conf`) 설정에 의해 다음과 같이 내부망 주소로 프록시 패스됩니다.

| 인입 URI 경로 (Inbound Path) | 목적지 컨테이너 주소 (Docker Upstream) | Basic Auth / 추가 어드민 권한 검증 | 목 적 |
| :--- | :--- | :--- | :--- |
| `/` | `cs-frontend-nginx` (Local Serve) | Basic Auth 적용 | 프론트엔드 React SPA 정적 리소스 서빙 |
| `/api/` | `http://cs-api:8080` | Basic Auth 적용 (`X-Remote-User` 전달) | 스프링 부트 업무 백엔드 API 연동 |
| `/n8n/` | `http://n8n:5678` | 어드민 로그인 검증 (`auth_request` 위임) | n8n 자동화 워크플로우 관리 콘솔 연결 |
| `/docs` | `http://cs-api:8080/docs` | 어드민 로그인 검증 (`auth_request` 위임) | 백엔드 API 문서 및 명세 조회 |
| `/wiki/` | `http://wiki:80` | 어드민 로그인 검증 (`auth_request` 위임) | Docusaurus 위키 기술 문서 서빙 |
| `/grafana/` | `http://grafana:3000` | 어드민 로그인 검증 (`auth_request` 위임) | 시스템 모니터링 로그 대시보드 |
| `/attachments/` | `http://minio:9000` | 보안 인증 제외 (익명 읽기) | MinIO 버킷 내 업로드된 첨부파일 다이렉트 뷰 |
| `/minio/` | `http://minio:9001` | 어드민 로그인 검증 (`auth_request` 위임) | MinIO 스토리지 웹 관리 콘솔 연결 |

---

## 🛡️ 4. 사설망 IP 접근 통제 (LAN IP Whitelisting)

Nginx 설정 상단에 LAN 외부 주소로부터의 공격 위협을 무력화하기 위해 사설 대역 IP 화이트리스트 필터링을 강제합니다.

```nginx
# 일반적인 가정/사무실 C클래스 사설망 대역 허용
allow 192.168.0.0/16;   
# 기업용 대형 네트워크 A클래스 사설망 대역 허용
allow 10.0.0.0/8;       
# Docker 내부 가상 브릿지망 대역 허용
allow 172.16.0.0/12;    
# 로컬 개발 접속 허용
allow 127.0.0.1;
allow ::1;
# IPv6 사설망 대역 허용
allow fc00::/7;         

# 상기 허용 리스트에 매칭되지 않는 외부 공인 IP (WAN) 요청은 즉각 거부 (HTTP 403 Forbidden)
deny all;               
```
