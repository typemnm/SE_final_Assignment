# Kelpus 테스트 보고서 — 1mn2147 기여 범위

- 제출 단계: 소프트웨어공학 최종 프로젝트 15주차 Test Report
- 작성일: 2026-06-15
- 대상 저장소: `SE_final_Assignment`
- 범위: Git 작성자 `1mn2147 <wed1234555@gmail.com>` 및 `Hwang Wonmin <59426466+1mn2147@users.noreply.github.com>`의 기능 중심 기여
- 산출물: 유닛/통합 테스트 케이스 목록, 커버리지 결과, 버그 로그, AI 생성 테스트 스크립트

---

## 1. 테스트 범위와 기준

본 보고서는 전체 프로젝트가 아니라 **1mn2147이 기여한 기능 중심 범위**만 대상으로 한다. Git 이력에는 동일 기여자가 두 작성자 식별자로 나타나므로, 인터뷰 단계에서 두 식별자를 같은 기여자로 간주하기로 확정했다.

### 1.1 포함 범위

| 영역 | 주요 파일/모듈 | 검증 목적 |
|---|---|---|
| Backend 식단 AI 분석 | `backend/app/infrastructure/adapters/ai_analyzer.py`, `backend/app/domains/diet/service.py` | Gemini/Gemma 기반 이미지 분석 요청 구성, URL/이미지 검증, provider 오류 처리, 사용량 증가/저장 순서 검증 |
| Backend Health Connect | `backend/app/domains/health/*`, `backend/app/domains/diet/*` | Health Connect 동기화 요청/응답 계약, 중복 처리, 부분 성공 응답, 식단 분석 결과의 Nutrition export 메타데이터 검증 |
| Frontend 식단 카메라/분석 | `kelpus/src/features/diet/*`, `kelpus/src/api/diet.api.ts` | 카메라 촬영 → 업로드 → 분석 요청 흐름, 사용자 오류 메시지, backend API 경로/필드 계약 검증 |
| Frontend Health Connect | `kelpus/src/features/health/*`, `kelpus/src/api/health.api.ts` | Health Connect 권한, 읽기/쓰기 어댑터, Nutrition write/delete, grouped sync payload 검증 |
| 테스트 스크립트 | `backend/tests/*`, `kelpus/src/**/__tests__/*`, `*.test.js` | 위 기능의 회귀 테스트와 커버리지 측정 |

### 1.2 제외 범위

다음 항목은 본 보고서의 필수 검증 범위에서 제외하고, 필요한 경우 제한사항/버그 로그에만 기록했다.

- 실제 Gemini/Gemma live API 호출: API 키 및 외부 네트워크 의존성을 제거하기 위해 mock 기반 테스트만 수행.
- 실제 Android Health Connect 실기기 검증: 로컬 CLI 환경에서 실기기/에뮬레이터가 없으므로 adapter mock과 계약 테스트로 대체.
- Android emulator E2E: 시간 및 환경 제약상 Jest/Unittest 수준의 통합 테스트로 대체.
- 타 기여자 기능: 1mn2147 기능과 직접 연결된 의존 모듈만 보조적으로 포함.
- 단순 문서/패키지/start.sh 수정: 테스트 환경 설명에 필요한 경우만 언급.

---

## 2. 테스트 환경

| 구분 | 도구/명령 | 비고 |
|---|---|---|
| Backend | Python 3.12, `unittest` | `backend/.venv/bin/python -m unittest` 사용 |
| Backend coverage-like | Python 표준 라이브러리 `trace` | `coverage.py` 미설치로 인해 trace summary를 커버리지 유사 지표로 사용 |
| Frontend | Jest 29.7.0 | `npx jest --runInBand --coverage` 사용 |
| Frontend coverage | Jest Istanbul coverage | 1mn2147 관련 파일만 `collectCoverageFrom`으로 지정 |
| 외부 연동 | MockTransport, Jest mock | live API/실기기 의존성 제거 |

실행 로그는 다음 위치에 보존했다.

- Backend unittest: `.omx/evidence/test-report-1mn2147/backend-unittest.log`
- Backend trace: `.omx/evidence/test-report-1mn2147/backend-trace.log`
- Frontend Jest coverage: `.omx/evidence/test-report-1mn2147/frontend-jest-coverage-after-ai.log`
- AI 생성 테스트 단독 실행: `.omx/evidence/test-report-1mn2147/frontend-ai-generated-test.log`

---

## 3. 테스트 실행 명령

### 3.1 Backend unittest

```bash
cd backend
../backend/.venv/bin/python -m unittest -v \
  tests.test_ai_analyzer \
  tests.test_diet_service_ai_errors \
  tests.test_diet_health_connect_export \
  tests.test_health_persistence_metadata \
  tests.test_health_sync_api \
  tests.test_health_sync_contract \
  tests.test_health_sync_service
```

결과 요약:

```text
Ran 50 tests in 0.106s
OK
```

### 3.2 Backend trace coverage-like 측정

```bash
cd backend
../backend/.venv/bin/python -m trace --count --missing --summary \
  --coverdir=../.omx/evidence/test-report-1mn2147/backend-trace \
  --ignore-dir=/usr \
  --ignore-dir=$(pwd)/../backend/.venv \
  --module unittest \
  tests.test_ai_analyzer \
  tests.test_diet_service_ai_errors \
  tests.test_diet_health_connect_export \
  tests.test_health_persistence_metadata \
  tests.test_health_sync_api \
  tests.test_health_sync_contract \
  tests.test_health_sync_service
```

결과 요약:

```text
Ran 50 tests in 0.591s
OK
```

### 3.3 Frontend Jest coverage

```bash
cd kelpus
npx jest \
  src/api/__tests__/diet.api.test.js \
  src/api/__tests__/diet.api.ai-generated.test.js \
  src/api/__tests__/health.api.test.js \
  src/features/diet/hooks/useDiet.test.js \
  src/features/diet/screens/DietScreen.test.js \
  src/features/diet/services/__tests__/dietCamera.service.test.js \
  src/features/diet/store/dietSlice.test.js \
  src/features/health/adapters/HealthConnectAdapter.test.js \
  src/features/health/adapters/HealthConnectNutritionWriter.test.js \
  src/features/health/hooks/useHealth.test.js \
  --runInBand --coverage \
  --collectCoverageFrom='src/api/diet.api.ts' \
  --collectCoverageFrom='src/api/health.api.ts' \
  --collectCoverageFrom='src/features/diet/hooks/useDiet.ts' \
  --collectCoverageFrom='src/features/diet/screens/DietScreen.tsx' \
  --collectCoverageFrom='src/features/diet/services/dietCamera.service.ts' \
  --collectCoverageFrom='src/features/diet/store/dietSlice.ts' \
  --collectCoverageFrom='src/features/health/adapters/HealthConnectAdapter.ts' \
  --collectCoverageFrom='src/features/health/adapters/HealthConnectNutritionWriter.ts' \
  --collectCoverageFrom='src/features/health/hooks/useHealth.ts'
```

결과 요약:

```text
Test Suites: 10 passed, 10 total
Tests:       62 passed, 62 total
```

---

## 4. 유닛/통합 테스트 케이스 목록

### 4.1 Backend — 식단 AI 분석/Gemini-Gemma adapter

| ID | 테스트 케이스 | 유형 | 검증 내용 | 결과 |
|---|---|---|---|---|
| BE-AI-01 | `test_analyze_image_success_builds_gemini_payload_and_parses_result` | Unit/Adapter | 이미지 URL 다운로드 후 provider payload 구성 및 분석 결과 파싱 | 통과 |
| BE-AI-02 | `test_missing_or_placeholder_config_fails_before_http` | Unit | API key 미설정/placeholder인 경우 HTTP 호출 전 실패 | 통과 |
| BE-AI-03 | `test_insecure_scheme_is_rejected_before_http` | Unit/Security | HTTPS가 아닌 URL 차단 | 통과 |
| BE-AI-04 | `test_redact_url_excludes_credentials_path_query_and_fragment` | Unit/Security | 로그용 URL redaction 시 credential/path/query/fragment 제거 | 통과 |
| BE-AI-05 | `test_private_or_local_image_url_is_rejected_before_http` | Unit/Security | localhost/private IP URL 차단 | 통과 |
| BE-AI-06 | `test_resolved_private_image_url_is_rejected_before_http` | Unit/Security | DNS 결과가 private IP인 경우 차단 | 통과 |
| BE-AI-07 | `test_validated_url_prefers_ipv4_connect_ip_when_available` | Unit | 검증된 IPv4 connect IP 우선 사용 | 통과 |
| BE-AI-08 | `test_redirect_is_rejected_without_following_private_target` | Unit/Security | redirect를 통한 내부망 우회 차단 | 통과 |
| BE-AI-09 | `test_image_fetch_failure_returns_422` | Unit/Error | 이미지 fetch 실패를 422로 매핑 | 통과 |
| BE-AI-10 | `test_unsupported_or_missing_mime_returns_422` | Unit/Error | 지원하지 않는 MIME/누락 MIME 차단 | 통과 |
| BE-AI-11 | `test_empty_image_returns_422` | Unit/Error | 빈 이미지 차단 | 통과 |
| BE-AI-12 | `test_oversized_image_returns_422` | Unit/Error | 최대 크기 초과 이미지 차단 | 통과 |
| BE-AI-13 | `test_content_length_oversized_image_returns_422` | Unit/Error | Content-Length 기반 초과 차단 | 통과 |
| BE-AI-14 | `test_fetch_image_sync_connects_to_prevalidated_ip_with_original_host` | Integration-like | 검증 IP 연결과 원본 host/SNI 유지 | 통과 |
| BE-AI-15 | `test_gemini_http_error_returns_502` | Unit/Error | provider HTTP 오류를 502로 매핑 | 통과 |
| BE-AI-16 | `test_gemini_timeout_returns_504` | Unit/Error | provider timeout을 504로 매핑 | 통과 |
| BE-AI-17 | `test_invalid_gemini_output_returns_502` | Unit/Error | provider 응답 파싱 실패를 502로 매핑 | 통과 |

### 4.2 Backend — DietService AI 오류 처리

| ID | 테스트 케이스 | 유형 | 검증 내용 | 결과 |
|---|---|---|---|---|
| BE-DIET-01 | `test_analyzer_error_does_not_save_or_increment_usage` | Unit/Service | 분석 실패 시 저장/사용량 증가 금지 | 통과 |
| BE-DIET-02 | `test_foreign_diet_record_id_does_not_call_analyzer_save_or_increment_usage` | Unit/Auth boundary | 타 사용자 식단 기록 ID에 대한 analyzer/save/usage 호출 차단 | 통과 |
| BE-DIET-03 | `test_success_saves_before_usage_increment` | Unit/Service | 성공 시 분석 저장 후 사용량 증가 순서 보장 | 통과 |

### 4.3 Backend — Health Connect 식단 export/API/service

| ID | 테스트 케이스 | 유형 | 검증 내용 | 결과 |
|---|---|---|---|---|
| BE-HC-DIET-01 | `test_exportable_requires_authentication` | API | exportable endpoint 인증 필요 | 통과 |
| BE-HC-DIET-02 | `test_exportable_endpoint_returns_current_user_records` | API/Integration-like | 현재 사용자 exportable 분석만 반환 | 통과 |
| BE-HC-DIET-03 | `test_status_update_endpoint_persists_health_connect_metadata` | API | Health Connect export 상태 메타데이터 저장 | 통과 |
| BE-HC-DIET-04 | `test_status_update_cross_user_rejection_returns_404` | API/Auth boundary | 다른 사용자 기록 상태 업데이트 차단 | 통과 |
| BE-HC-DIET-05 | `test_delete_endpoint_returns_metadata_for_client_cleanup` | API | 삭제 시 클라이언트 Health Connect cleanup 메타데이터 반환 | 통과 |
| BE-HC-DIET-06 | `test_latest_analysis_rows_keeps_only_newest_analysis_per_diet_record` | Service | 식단 기록별 최신 분석만 export 후보 유지 | 통과 |
| BE-HC-DIET-07 | `test_repository_exportable_query_excludes_inbound_health_connect_records` | Repository | Health Connect inbound 기록을 outbound export에서 제외 | 통과 |
| BE-HC-DIET-08 | `test_repository_status_update_preserves_inbound_external_id` | Repository | inbound external id 보존 | 통과 |
| BE-HC-DIET-09 | `test_repository_failed_status_preserves_existing_uuid_and_version` | Repository | 실패 상태에서도 기존 UUID/version 보존 | 통과 |
| BE-HC-DIET-10 | `test_service_status_update_sanitizes_error_and_maps_missing_record_to_404` | Service/Error | 오류 메시지 sanitizing 및 missing record 404 매핑 | 통과 |

### 4.4 Backend — Health Connect sync 계약/서비스/메타데이터

| ID | 테스트 케이스 | 유형 | 검증 내용 | 결과 |
|---|---|---|---|---|
| BE-HC-META-01 | `test_diet_record_has_health_connect_source_and_external_id` | Unit/Model | DietRecord Health Connect source/external id 필드 존재 | 통과 |
| BE-HC-META-02 | `test_diet_record_has_outbound_health_connect_export_metadata` | Unit/Model | outbound export 메타데이터 필드 존재 | 통과 |
| BE-HC-META-03 | `test_health_connect_tables_are_registered_in_base_metadata` | Unit/Model | Health Connect 테이블 metadata 등록 | 통과 |
| BE-HC-META-04 | `test_health_model_unique_constraints_are_user_scoped` | Unit/Model | unique constraint가 사용자 단위로 scoped | 통과 |
| BE-HC-API-01 | `test_sync_requires_authentication` | API | sync endpoint 인증 필요 | 통과 |
| BE-HC-API-02 | `test_invalid_top_level_envelope_returns_422` | API/Validation | 잘못된 envelope 422 반환 | 통과 |
| BE-HC-API-03 | `test_success_response_contract` | API/Contract | 성공 응답 계약 검증 | 통과 |
| BE-HC-API-04 | `test_replay_can_report_skipped_counts` | API/Contract | replay 중복 건 skipped count 보고 | 통과 |
| BE-HC-API-05 | `test_partial_failure_response_contract` | API/Contract | 부분 실패 응답 계약 검증 | 통과 |
| BE-HC-CON-01 | `test_success_request_matches_typed_contract` | Contract | fixture가 typed schema와 일치 | 통과 |
| BE-HC-CON-02 | `test_top_level_envelope_accepts_raw_items_for_service_level_validation` | Contract | service-level validation을 위한 raw item 수용 | 통과 |
| BE-HC-CON-03 | `test_invalid_envelope_fails_before_service_processing` | Contract | service 처리 전 envelope 검증 실패 | 통과 |
| BE-HC-CON-04 | `test_response_fixtures_cover_partial_success_and_failed_counts` | Contract | partial/failed count fixture 보장 | 통과 |
| BE-HC-CON-05 | `test_fallback_key_policy_documents_speed_as_derivation_only` | Contract | speed는 파생값이며 dedupe key 제외 정책 문서화 | 통과 |
| BE-HC-SVC-01 | `test_fallback_external_id_is_deterministic` | Service | external id fallback 결정성 | 통과 |
| BE-HC-SVC-02 | `test_envelope_accepts_missing_external_id_for_service_fallback` | Service | external id 누락 시 service fallback 허용 | 통과 |
| BE-HC-SVC-03 | `test_nutrition_duplicate_skips_without_savepoint` | Service | 중복 Nutrition skip 처리 | 통과 |
| BE-HC-SVC-04 | `test_nutrition_create_uses_savepoint_and_health_connect_source` | Service | savepoint와 Health Connect source 저장 | 통과 |
| BE-HC-SVC-05 | `test_group_processing_counts_item_validation_and_persistence_failures` | Service | item validation/persistence 실패 count 집계 | 통과 |
| BE-HC-SVC-06 | `test_response_status_partial_when_created_and_failed` | Service | 생성+실패 혼합 시 partial status | 통과 |

### 4.5 Frontend — 식단 API/카메라/화면/hook/store

| ID | 테스트 케이스 | 유형 | 검증 내용 | 결과 |
|---|---|---|---|---|
| FE-DIET-API-01 | `uploads diet images as multipart form data...` | Unit/API | `/api/v1/diet/upload` multipart `file` 필드 계약 | 통과 |
| FE-DIET-API-02 | `persists Health Connect Nutrition export status...` | Unit/API | snake_case backend export 상태 계약 | 통과 |
| FE-DIET-API-03 | `fetches exportable analyses and deletes owned diet records...` | Unit/API | exportable 조회 및 diet record 삭제 endpoint 계약 | 통과 |
| FE-DIET-AI-01 | `requests URL-based AI analysis...` | Unit/API, AI 생성 | `/api/v1/diet/analyze` URL 분석 요청 및 envelope unwrap | 통과 |
| FE-DIET-AI-02 | `keeps legacy non-envelope analysis responses compatible` | Unit/API, AI 생성 | 기존 non-envelope 응답 호환성 | 통과 |
| FE-DIET-AI-03 | `reads analysis history and quota endpoints...` | Unit/API, AI 생성 | history/count endpoint 경로 불변성 | 통과 |
| FE-CAM-01 | `builds multipart form data with the backend file field` | Unit | 촬영 asset → FormData 변환 | 통과 |
| FE-CAM-02 | `returns null when the user cancels native camera capture` | Unit | 카메라 취소 처리 | 통과 |
| FE-CAM-03 | `maps native camera permission failures...` | Unit/Error | 권한 오류 사용자 메시지 | 통과 |
| FE-CAM-04 | `rejects malformed camera assets before upload` | Unit/Error | 잘못된 asset 차단 | 통과 |
| FE-CAM-05 | `maps unavailable native camera failures...` | Unit/Error | 카메라 미지원 메시지 | 통과 |
| FE-SCREEN-01 | `preserves manual URL analysis...` | UI Integration-like | 수동 URL 분석 성공 후 결과 이동 | 통과 |
| FE-SCREEN-02 | `runs camera analysis...` | UI Integration-like | 카메라 분석 성공 후 결과 이동 | 통과 |
| FE-SCREEN-03 | `renders a single error message...` | UI | 카메라/분석 오류 중복 시 단일 메시지 | 통과 |
| FE-SCREEN-04 | `keeps manual analysis errors visible...` | UI | 수동 분석 오류 유지 | 통과 |
| FE-SCREEN-05 | `clears stale camera errors...` | UI | 수동 분석 시작 전 stale camera error 제거 | 통과 |
| FE-SCREEN-06 | `shows camera errors and progress while busy` | UI | busy/error UX 표시 | 통과 |
| FE-SCREEN-07 | `renders Health Connect export status...` | UI | export 상태 표시와 결과 이동 공존 | 통과 |
| FE-SCREEN-08 | `runs retryable backfill...` | UI Integration-like | retryable backfill summary UX | 통과 |
| FE-HOOK-01~09 | `useDiet.test.js` 9개 | Hook/Integration-like | 402 메시지, upload 실패, export status, backfill, Health Connect 삭제 실패 복구 등 | 통과 |
| FE-STORE-01 | `keeps Health Connect export orchestration out of reducer fulfillment` | Unit/Reducer | reducer 책임 경계 유지 | 통과 |

### 4.6 Frontend — Health Connect adapter/hook/API

| ID | 테스트 케이스 | 유형 | 검증 내용 | 결과 |
|---|---|---|---|---|
| FE-HC-API-01 | `posts grouped Health Connect payloads...` | Unit/API | canonical API path로 grouped payload 전송 | 통과 |
| FE-HC-API-02 | `unwraps backend {data} envelopes defensively` | Unit/API | backend envelope unwrap | 통과 |
| FE-HC-ADP-01~11 | `HealthConnectAdapter.test.js` 11개 | Unit/Adapter | 권한 요청, SDK unavailable, Nutrition/Running/Steps/Calories/HeartRate 매핑, native read failure 표면화 | 통과 |
| FE-HC-WR-01~11 | `HealthConnectNutritionWriter.test.js` 11개 | Unit/Adapter | WRITE_NUTRITION 권한, clientRecordId/version, nutrient mapping, insert/delete, permission/unavailable/failed 상태 | 통과 |
| FE-HC-HOOK-01~06 | `useHealth.test.js` 6개 | Hook/Integration-like | legacy adapter → grouped payload, unavailable/denied/no-data UX, partial success, backend failed/native error 처리 | 통과 |

---

## 5. 커버리지 결과

### 5.1 Frontend Jest coverage

AI 생성 테스트 추가 후 최종 scoped coverage는 다음과 같다.

| 파일 | Statements | Branch | Functions | Lines | 비고 |
|---|---:|---:|---:|---:|---|
| All files | 71.88% | 61.70% | 81.89% | 73.73% | 1mn2147 관련 frontend 파일 scoped 집계 |
| `src/api/diet.api.ts` | 94.44% | 100% | 88.88% | 94.44% | AI 생성 테스트로 크게 개선 |
| `src/api/health.api.ts` | 100% | 100% | 100% | 100% | Health sync API 계약 완전 커버 |
| `src/features/diet/hooks/useDiet.ts` | 48.33% | 62.31% | 55.55% | 49.55% | export/backfill/delete 주요 경로 커버, 일부 UI 상태 경로 미커버 |
| `src/features/diet/screens/DietScreen.tsx` | 82.14% | 67.39% | 50.00% | 85.18% | 주요 camera/manual/error UX 커버 |
| `src/features/diet/services/dietCamera.service.ts` | 94.44% | 64.28% | 100% | 94.44% | camera asset/error 처리 대부분 커버 |
| `src/features/diet/store/dietSlice.ts` | 45.45% | 0% | 25.00% | 45.45% | reducer 일부만 범위에 포함, 추가 reducer 테스트 여지 있음 |
| `src/features/health/adapters/HealthConnectAdapter.ts` | 78.76% | 47.36% | 97.50% | 82.50% | native read/permission/record mapping 중심 커버 |
| `src/features/health/adapters/HealthConnectNutritionWriter.ts` | 90.35% | 73.11% | 100% | 94.39% | Nutrition write/delete 주요 경로 우수 |
| `src/features/health/hooks/useHealth.ts` | 56.92% | 61.36% | 77.77% | 56.25% | UX status와 sync error 중심 커버 |

Frontend coverage 명령 결과:

```text
Test Suites: 10 passed, 10 total
Tests:       62 passed, 62 total
All files:   71.88% statements, 61.70% branches, 81.89% functions, 73.73% lines
```

### 5.2 Backend trace coverage-like 결과

Backend는 `coverage.py`가 설치되어 있지 않아 Python 표준 라이브러리 `trace --summary` 결과를 커버리지 유사 지표로 기록했다. 1mn2147 핵심 모듈 중심 결과는 다음과 같다.

| 파일/모듈 | Lines | trace cov% | 해석 |
|---|---:|---:|---|
| `app.infrastructure.adapters.ai_analyzer` | 477 | 71% | Gemini/Gemma adapter의 URL 검증, 이미지 fetch, provider 오류 처리까지 상당 부분 검증 |
| `app.domains.diet.router` | 120 | 70% | 식단 API endpoint 계약 상당 부분 검증 |
| `app.domains.diet.service` | 168 | 63% | AI 분석 성공/실패와 Health Connect export 서비스 일부 검증 |
| `app.domains.diet.repository` | 172 | 61% | exportable/status update repository 경로 검증 |
| `app.domains.diet.schemas` | 98 | 100% | Diet schema 계약 전부 실행 |
| `app.domains.health.router` | 18 | 100% | Health sync router 경로 실행 |
| `app.domains.health.schemas` | 82 | 100% | Health Connect schema 계약 전부 실행 |
| `app.domains.health.service` | 253 | 62% | sync/dedupe/partial failure 서비스 핵심 경로 검증 |
| `app.config` | 28 | 100% | 설정 로딩 경로 실행 |
| `app.database` | 27 | 77% | Base metadata/DB 설정 일부 실행 |

Backend 실행 결과:

```text
Ran 50 tests in 0.106s
OK
```

Trace 실행 결과:

```text
Ran 50 tests in 0.591s
OK
```

---

## 6. AI 생성 테스트 스크립트

보고서 요구사항에 따라, 본 테스트 과정에서 AI가 추가 생성한 회귀 테스트 스크립트를 포함했다.

- 파일: `kelpus/src/api/__tests__/diet.api.ai-generated.test.js`
- 목적: 1mn2147 식단 분석 API 계약 중 기존 coverage가 낮았던 `requestAnalysis`, `getAnalysisHistory`, `getAnalysisCount` 경로 보강
- 실행 결과: 3개 테스트 모두 통과

단독 실행 결과:

```text
PASS src/api/__tests__/diet.api.ai-generated.test.js
Tests: 3 passed, 3 total
```

생성된 테스트 스크립트 본문:

```javascript
import {dietApi} from '../diet.api';
import {apiClient} from '../index';

jest.mock('../index', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('dietApi AI-generated regression tests', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it('requests URL-based AI analysis through the backend analyze contract and unwraps envelopes', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          id: 'analysis-1',
          total_calories: 512,
          carb_ratio: 45,
          protein_ratio: 25,
          fat_ratio: 30,
        },
      },
    });

    await expect(
      dietApi.requestAnalysis({
        image_url: 'https://cdn.example.com/meals/kimchi-stew.jpg',
        diet_record_id: 'diet-record-1',
      }),
    ).resolves.toMatchObject({
      id: 'analysis-1',
      total_calories: 512,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/diet/analyze', {
      image_url: 'https://cdn.example.com/meals/kimchi-stew.jpg',
      diet_record_id: 'diet-record-1',
    });
  });

  it('keeps legacy non-envelope analysis responses compatible', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        id: 'legacy-analysis-1',
        total_calories: 390,
      },
    });

    await expect(dietApi.requestAnalysis({image_url: 'https://cdn.example.com/meal.jpg'})).resolves
      .toMatchObject({
        id: 'legacy-analysis-1',
        total_calories: 390,
      });
  });

  it('reads analysis history and quota endpoints without mutating backend paths', async () => {
    apiClient.get.mockResolvedValueOnce({data: []});
    apiClient.get.mockResolvedValueOnce({data: {remaining: 2, total: 3}});

    await expect(dietApi.getAnalysisHistory()).resolves.toEqual({data: []});
    await expect(dietApi.getAnalysisCount()).resolves.toEqual({data: {remaining: 2, total: 3}});

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/diet/history');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/diet/count');
  });
});
```

AI 생성 테스트 추가 전후 frontend scoped coverage 비교:

| 항목 | 추가 전 | 추가 후 | 변화 |
|---|---:|---:|---:|
| 전체 Statements | 71.13% | 71.88% | +0.75%p |
| 전체 Functions | 79.31% | 81.89% | +2.58%p |
| 전체 Lines | 72.92% | 73.73% | +0.81%p |
| `diet.api.ts` Statements | 72.22% | 94.44% | +22.22%p |
| API 그룹 Statements | 79.16% | 95.83% | +16.67%p |

---

## 7. 버그 로그 및 제한사항

| ID | 분류 | 관찰 내용 | 영향 | 상태/처리 |
|---|---|---|---|---|
| BUG-01 | Test warning | `DietScreen.test.js` 실행 중 React Native Animated update가 `act(...)`로 감싸지지 않았다는 `console.error` warning 출력 | 테스트는 통과하지만 비동기 animation/state update가 테스트 종료 후 발생할 수 있어 향후 flakiness 가능성 | 버그 로그에 기록. 기능 실패는 아니므로 이번 보고서에서는 WATCH로 분류 |
| BUG-02 | Coverage tooling | Backend `coverage.py`가 설치되어 있지 않아 표준 coverage report 대신 `trace --summary` 사용 | pytest/coverage.py 형식의 branch coverage는 제공하지 못함 | 제한사항으로 기록. 별도 의존성 추가 없이 표준 라이브러리로 대체 |
| BUG-03 | External API excluded | 실제 Gemini/Gemma provider live 호출 미수행 | provider 인증/요금/네트워크 문제는 검증하지 못함 | 의도적 제외. MockTransport/fixture로 adapter 계약 검증 |
| BUG-04 | Device/E2E excluded | 실제 Android Health Connect 및 emulator E2E 미수행 | Android OS 권한 UI, 실기기 provider availability, Google Health Connect 앱 버전 차이는 검증하지 못함 | 의도적 제외. Adapter mock, permission mock, API contract test로 대체 |
| BUG-05 | Low reducer coverage | `dietSlice.ts` coverage가 Statements 45.45%, Branch 0%로 낮음 | reducer edge case 회귀 탐지력이 제한적 | 추가 reducer 테스트 권장. 단, 핵심 Health Connect orchestration 책임 경계 테스트는 통과 |
| BUG-06 | Hook uncovered lines | `useDiet.ts`, `useHealth.ts` 일부 UI 상태/분기 coverage가 50~57% 수준 | 복잡한 hook 상태 조합 일부 미검증 | 추가 hook scenario 테스트 권장. 현재 핵심 success/error/partial 경로는 통과 |

---

## 8. 결론

1mn2147 기여 범위의 핵심 기능인 **식단 AI 분석**, **카메라 기반 식단 분석**, **Health Connect 동기화 및 Nutrition export**는 backend 50개 테스트와 frontend 62개 테스트에서 모두 통과했다. Backend는 live Gemini/Gemma 호출 없이 URL 보안 검증, 이미지 fetch, provider 오류 매핑, 분석 저장/사용량 증가 순서, Health Connect 계약과 부분 성공 로직을 검증했다. Frontend는 Jest로 API 계약, 카메라 오류 처리, DietScreen UX, Health Connect adapter/hook/write/delete 흐름을 검증했다.

커버리지 측면에서는 frontend scoped coverage가 전체 Statements 71.88%, Lines 73.73%이며, AI 생성 테스트 추가로 `diet.api.ts` Statements가 72.22%에서 94.44%로 개선되었다. Backend는 `coverage.py`가 없어 `trace --summary`를 사용했으며, 핵심 모듈인 `ai_analyzer` 71%, `diet.router` 70%, `health.schemas` 100%, `health.router` 100%, `health.service` 62%의 실행 근거를 확보했다.

남은 리스크는 실기기/외부 API/E2E 미검증과 일부 hook/reducer coverage 부족이다. 그러나 본 보고서의 합의 범위가 offline/mock-first 검증이므로, 제출용 테스트 보고서 기준에서는 핵심 회귀 테스트와 제한사항 기록이 충족되었다.
