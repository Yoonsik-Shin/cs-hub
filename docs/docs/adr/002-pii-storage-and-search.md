---
sidebar_label: ADR-002 PII 저장과 검색
---

# ADR-002. PII 저장 암호화와 검색 보조값 분리

- 상태: 채택
- 결정일: 2026-08-11

## 배경

문의 본문, 전화번호, 이메일 메타데이터에는 개인정보가 포함된다. DB 유출 시 원문 노출을 줄이기 위해 저장 암호화가 필요하지만, 이메일 회신 fallback은 같은 발신자인지 등치 검색해야 한다.

랜덤 IV를 사용하는 안전한 암호화 결과는 같은 평문이라도 매번 달라지므로 암호문 자체를 검색 키로 사용할 수 없다.

## 결정

- 저장 값은 AES-GCM으로 암호화한다.
- 암호화마다 12바이트 랜덤 IV와 128비트 인증 태그를 사용한다.
- 등치 검색이 필요한 값은 정규화 후 HMAC-SHA256 보조값을 별도 저장한다.
- 이메일 주소는 표시 이름을 제거하고 소문자로 변환한 뒤 HMAC을 계산한다.
- 키 용도를 분리하기 위해 PII 키와 네이버 세션 암호화 키는 별도 환경변수로 관리한다.
- 기존 평문 마이그레이션 기간에는 읽기 시 복호화 실패 값을 평문으로 취급하지만 새 저장 값은 항상 암호화한다.

## 검토한 대안

### 결정적 암호화

암호문 등치 검색은 쉬워지지만 동일 평문의 반복 패턴이 노출된다. 저장 기밀성과 검색 목적을 분리하기 위해 랜덤 IV 암호화와 HMAC을 선택했다.

### 평문 검색 컬럼

구현은 단순하지만 암호화한 본문과 별개로 이메일 원문이 남으므로 채택하지 않았다.

### 애플리케이션 전체에서 수동 암복호화

호출 누락 위험이 있어 JPA converter를 저장 경계로 사용했다. 다만 Hibernate가 converter를 직접 생성하므로 Spring 관리 암호화 객체를 정적 holder를 통해 제공하는 절충이 존재한다.

## 결과와 한계

- DB에는 동일 평문의 반복 패턴이 드러나지 않는다.
- GCM 태그로 암호문 위변조를 감지한다.
- HMAC은 원문 복원이 아니라 등치 비교에만 사용한다.
- HMAC 키가 노출되면 후보 대입 공격이 가능하므로 키 관리와 회전 절차가 별도로 필요하다.
- 레거시 평문 pass-through는 마이그레이션 기간에만 유지해야 한다.

## 코드와 검증

- [PiiEncryptionUtils](../../../apps/cs-api/src/main/java/com/ttam/cs/infra/security/crypto/PiiEncryptionUtils.java)
- [EncryptedStringConverter](../../../apps/cs-api/src/main/java/com/ttam/cs/infra/security/crypto/EncryptedStringConverter.java)
- [PiiEncryptionUtilsTest](../../../apps/cs-api/src/test/java/com/ttam/cs/infra/security/crypto/PiiEncryptionUtilsTest.java)
- [EncryptedStringConverterTest](../../../apps/cs-api/src/test/java/com/ttam/cs/infra/security/crypto/EncryptedStringConverterTest.java)
- [PII 마이그레이션 가이드](../pii-encryption-migration.md)
