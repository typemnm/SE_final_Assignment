# Kelpus 최종 테스팅 보고서

> 작성 기준일: 2026-06-19 (KST)  
> 대상 리비전: `75a41d7` 및 작성 시점의 미커밋 테스트 산출물  
> 검토 대상: `docs/TESTING.md`, `docs/test-report-1mn2147.md`, `backend/tests`, `kelpus` Jest 테스트  
> 문서 분량 기준: 표와 코드 부록을 포함한 약 5~10페이지 제출용 요약

---

## 1. 최종 요약

Kelpus는 React Native 프론트엔드와 FastAPI 백엔드로 구성된 건강 관리 애플리케이션이다. 이번 재검토에서는 기존 `docs/TESTING.md`의 계획 중심 내용을 현재 코드와 실제 실행 결과에 대조하였다. 검증 범위는 인증/사용자, 식단 AI 분석, Health Connect 동기화, 러닝, SNS, 프론트엔드 상태·화면·API 계층이다.

### 1.1 실행 결과 한눈에 보기

| 구분 | 도구 | 결과 | 라인 커버리지 | 브랜치 커버리지 | 판정 |
|---|---|---:|---:|---:|---|
| Backend 전체 | Pytest 9.1.0 + coverage.py/pytest-cov | **92 passed**, 18 subtests passed | **82.15%** (1,556/1,872) | **75.37%** (202/268) | 유효, 목표(80/75) 충족 |
| Frontend 전체 | Jest 29.7.0 + Istanbul | 14/24 suites passed, 10 suites load 실패; 로드된 assertion **74/74 passed** | 28.96% 진단값 | 21.42% 진단값 | **무효 측정**—전체 suite 실패 |

백엔드는 전체 테스트와 커버리지 목표를 통과했다. 프론트엔드는 실행된 74개 assertion 자체는 모두 통과했지만 10개 suite가 테스트 로딩 단계에서 실패했다. 따라서 생성된 28.96%/21.42%는 실패 시점의 부분 실행 결과일 뿐, 제품 전체의 공식 커버리지로 사용할 수 없다.

### 1.2 기존 `TESTING.md` 재검토 결론

1. `TESTING.md`는 테스트 원칙, 요구사항 추적성, 블랙박스/화이트박스 설계가 상세한 **테스트 계획서**로서는 적절하다.
2. §4.6의 네 커버리지 값과 다수 테스트의 실제 출력이 여전히 `[측정 예정]`이므로 **실행 보고서로는 미완성**이다.
3. 문서의 React Native 버전은 0.74로 적혀 있으나 현재 `kelpus/package.json`은 **0.75.4**이다.
4. 과거 `test-report-1mn2147.md`의 “backend coverage.py 미설치” 제한은 더 이상 유효하지 않다. 현재 격리 가상환경에서 Pytest/coverage.py 측정이 가능하다.
5. 과거 frontend scoped coverage(라인 73.73%)는 제한된 파일 집합·과거 snapshot의 값이다. 현재 전체 `src` 분모 및 실패한 전체 suite 결과와 섞어 최종 수치로 재사용하지 않았다.
6. 계획서에 있는 실기기, 스토어 결제, 실제 SNS/LLM, 부하·인수 테스트는 이번 자동 회귀 실행에 포함되지 않았다.

---

## 2. 테스트 환경과 재현 방법

### 2.1 환경

| 항목 | 값 |
|---|---|
| OS/실행 환경 | Linux, Python 3.12.3 |
| Backend | FastAPI, Pytest 9.1.0, coverage.py branch mode |
| Frontend | React Native 0.75.4, Jest 29.7.0, Testing Library RN |
| 격리 방식 | DB/HTTP/native module을 fake, mock, patch로 치환 |
| 외부 연동 | live Gemini/Gemma, Health Connect 실기기, SNS, 결제 sandbox 미실행 |

### 2.2 실행 명령

```bash
# Backend: 전체 제품 코드와 branch coverage
cd backend
.venv/bin/python -m pytest tests \
  --cov=app --cov-branch \
  --cov-report=term-missing \
  --cov-report=json:coverage-final.json -q

# Frontend: 전체 suite 상태 확인
cd kelpus
npx jest --runInBand

# Frontend: 제품 src 전체를 분모로 한 측정 시도
npx jest --runInBand --coverage \
  --coverageReporters=text \
  --coverageReporters=json-summary \
  --coverageReporters=json \
  --collectCoverageFrom='src/**/*.{js,jsx,ts,tsx}' \
  --collectCoverageFrom='!src/**/*.test.{js,jsx,ts,tsx}' \
  --collectCoverageFrom='!src/**/*.spec.{js,jsx,ts,tsx}' \
  --collectCoverageFrom='!src/**/__tests__/**' \
  --collectCoverageFrom='!src/**/*.d.ts' \
  --collectCoverageFrom='!src/**/index.ts' \
  --collectCoverageFrom='!src/shims/**'
```

프론트엔드 제외 규칙은 테스트 코드가 자기 자신을 커버리지 분모에 넣는 것을 막고, 선언 파일·barrel·native shim만 기술적으로 제외한다. 화면, 컴포넌트, hook, store, API, web/native 구현은 제품 분모에 남긴다.

---

## 3. 유닛/통합 테스트 케이스 목록

테스트 파일별 실제 수집 건수를 기준으로 정리했다. “통합”은 네트워크나 DB를 실제 외부 환경에 연결한다는 뜻이 아니라, router-service-schema/repository 또는 component-hook-store처럼 둘 이상의 내부 계층 계약을 함께 검증하는 테스트를 뜻한다.

### 3.1 Backend—Pytest 92개

| 파일/영역 | 수집 수 | 수준 | 주요 케이스 |
|---|---:|---|---|
| `test_ai_analyzer.py` | 17 | 유닛/어댑터 | 정상 AI payload, timeout/HTTP/잘못된 응답, MIME·크기 검증, SSRF 방어, redirect 차단, URL 비식별화 |
| `test_dependency_sns_gap_coverage.py` | 5 | 유닛/통합 | DB commit/rollback, JWT claim, 구독 분기, SNS cache hit/miss/failure, 모델 분기 |
| `test_diet_gap_coverage.py` | 9 | 유닛/통합 | OS 식단 fallback, 분석 한도 사전·사후 재검사, 레코드 소멸, export helper, 업로드 크기/MIME |
| `test_diet_health_connect_export.py` | 10 | 통합 | 인증된 export 조회, 상태 갱신, 타 사용자 차단, 삭제 metadata, 최신 분석 선택, 실패 상태 identity 보존 |
| `test_diet_service_ai_errors.py` | 3 | 유닛 | AI 오류 시 저장/사용량 증가 금지, 타 사용자 record 차단, 성공 시 저장 후 사용량 증가 순서 |
| `test_health_persistence_metadata.py` | 4 | 스키마 통합 | Health Connect 테이블 등록, source/external ID, outbound export metadata, 사용자 범위 unique constraint |
| `test_health_sync_api.py` | 5 | API 통합 | 인증 요구, 잘못된 envelope 422, 성공/부분 성공/replay skipped 응답 계약 |
| `test_health_sync_contract.py` | 5 | 계약 | JSON fixture typed validation, 잘못된 envelope, partial/failed count, fallback key 정책 |
| `test_health_sync_service.py` | 6 | 서비스 통합 | deterministic external ID, duplicate skip, savepoint, validation/persistence failure count, partial status |
| `test_running_gap_coverage.py` | 8 | 유닛/통합 | 계산 경계, percentile clamp, sync 신규/중복, 조회·삭제·course, leaderboard, repository 분기 |
| `test_user_service_coverage.py` | 20 | 유닛/통합 | 가입 중복/성공, 로그인 실패·성공, refresh claim, profile CRUD, 구독, social provider, 탈퇴, repository |

#### 핵심 Backend 시나리오

- **인증/보안:** 잘못된 refresh claim, 비활성 사용자, 중복 이메일, Google/Apple/Kakao provider 분기를 검증한다.
- **AI 분석:** 빈 이미지, 과대 이미지, 비지원 MIME, 사설 IP/localhost/redirect를 차단하고 provider timeout을 504, provider 오류를 502로 매핑한다.
- **과금/한도:** AI 호출 전과 호출 후에 잔여 횟수를 다시 검사하고, 실패 시 저장·사용량 증가가 발생하지 않는지 확인한다.
- **Health Connect:** 중복 입력은 skip하고 개별 실패는 전체 transaction을 오염시키지 않으며 partial success count가 계약과 일치하는지 검증한다.
- **데이터 소유권:** 타 사용자의 식단 record 상태 변경을 404로 숨기고, unique constraint가 사용자 범위로 구성되는지 확인한다.

### 3.2 Frontend—Jest 선언 케이스

현재 root Jest가 인식한 것은 총 24 suites다. 아래에서 “실행”은 assertion까지 도달한 suite, “로드 실패”는 import/transform 단계에서 멈춘 suite다.

#### 실행 성공: 14 suites, 74 assertions

| 파일/영역 | assertion | 주요 케이스 |
|---|---:|---|
| `HealthConnectNutritionWriter.test.js` | 12 | stable client ID/version, 영양소 mapping, 권한, write/delete, 실패 상태 |
| `HealthConnectAdapter.test.js` | 11 | 최소 read 권한, availability, nutrition/running/activity/heart-rate mapping |
| `useDiet.test.js` | 11 | 수동 URL/카메라 분석, 중복 오류 표시 방지, export/backfill/delete orchestration |
| `useHealth.test.js` | 6 | grouped payload, unavailable/update/denied/no-data, partial/failed backend 응답 |
| `stateAndApi.test.js` | 6 | auth/profile/running/SNS/subscription reducer 및 API 계약 |
| `dietCamera.service.test.js` | 5 | multipart field, 취소, 권한/asset/unavailable 오류 |
| `shareServicesCoverage.test.js` | 5 | Android/iOS/web 공유, fallback, clipboard/download |
| `snsModalsCoverage.test.js` | 4 | composer/viewer validation, metadata, 공유 분기 |
| `reelCreatorCoverage.test.js` | 4 | 선택/preview/share 단계와 empty branch |
| `diet.api.ai-generated.test.js` | 3 | 분석 envelope, legacy 응답, history/count endpoint |
| `diet.api.test.js` | 3 | API unwrap 및 request 계약 |
| `health.api.test.js` | 2 | sync endpoint와 envelope unwrap |
| `client.config.test.js` | 1 | build environment base URL 정규화 |
| `dietSlice.test.js` | 1 | Health Connect orchestration과 reducer 책임 분리 |

#### 로드 실패: 10 suites, assertion 미실행

| 파일/영역 | 선언 케이스 수 | 실패 원인 |
|---|---:|---|
| `__tests__/App.test.tsx` | 1 | `react-native-linear-gradient` ESM transform 실패 |
| `KelpusNative/__tests__/App.test.tsx` | 1 | 별도 nested RN 프로젝트까지 root Jest가 수집, Flow syntax transform 실패 |
| `deterministicCoverage.test.js` | 12 | linear-gradient import transform 실패 |
| `authScreensCoverage.test.js` | 7 | linear-gradient import transform 실패 |
| `snsCardsCoverage.test.js` | 4 | linear-gradient import transform 실패 |
| `feedScreenCoverage.test.js` | 3 | linear-gradient import transform 실패 |
| `profileScreensCoverage.test.js` | 3 | linear-gradient import transform 실패 |
| `runningListCoverage.test.js` | 4 | linear-gradient import transform 실패 |
| `DietScreen.test.js` | 8 | linear-gradient import transform 실패 |
| `webMapsCoverage.test.js` | 4 | 존재하지 않는 `RunningMapView.web` module import |

로드 실패 suite에는 화면 렌더링, 인증 입력 검증, 러닝 목록/리더보드, SNS 카드/피드, profile 설정, 지도 초기화 등 중요한 UI 회귀 케이스가 포함되어 있다. 선언된 테스트 수를 전체 통과 수에 더하지 않았다.

---

## 4. 커버리지 결과 및 해석

### 4.1 Backend 유효 결과

| 지표 | covered/total | 결과 | 목표 | 상태 |
|---|---:|---:|---:|---|
| Lines | 1,556/1,872 | **82.15%** | 80% | PASS |
| Branches | 202/268 | **75.37%** | 75% | PASS |

coverage.py JSON에서 line 의미는 `covered_lines/num_statements`로 기록되며 정확한 raw count는 1,556/1,872이다. 단순 반올림 값(82%)이 아니라 raw count로 목표를 판정했다.

주요 고커버리지 모듈은 user service 98%, diet service 97%, diet router 97%, running service 99%, running repository 100%다. 반면 다음 모듈은 우선 보강 대상이다.

| 모듈 | 현재 cover | 해석/조치 |
|---|---:|---|
| `apple_health.py` | 0% | 추상/외부 adapter 계약 test 필요 |
| `samsung_health.py` | 0% | 플랫폼별 구현 또는 명시적 abstract exclusion 판단 필요 |
| `health_adapter.py` | 0% | interface/NotImplemented 경로를 분모에 둘지 정책 필요 |
| `map_adapter.py` | 0% | 지도 adapter 유닛 test와 오류 mapping 필요 |
| `seed.py` | 0% | 운영 runtime인지 관리 script인지 분모 정책 확정 필요 |
| `sns/repository.py` | 32% | DB query 성공/빈 결과/예외 테스트 필요 |
| `sns_crawler.py` | 43% | pagination, filtering, rate-limit/HTTP failure test 필요 |
| `database.py` | 60% | session lifecycle/rollback test 보강 |
| `health/service.py` | 67% | daily activity/heart rate persistence 세부 분기 보강 |

### 4.2 Frontend 측정 무효와 진단값

Jest는 전체 실행 종료 상태 1을 반환했다.

```text
Test Suites: 10 failed, 14 passed, 24 total
Tests:       74 passed, 74 total
Snapshots:   0 total
```

실패 실행 중 생성된 Istanbul summary는 lines 910/3,142(28.96%), branches 437/2,040(21.42%)이다. 이 값은 로드 실패한 화면 모듈들이 실행되지 않은 결과이므로 **공식 커버리지 수치가 아니다**. 프론트엔드 목표 70/65의 PASS/FAIL도 유효한 전체 실행 전에는 판정하지 않는다.

다음 순서로 정상화해야 한다.

1. root Jest의 `roots` 또는 `testPathIgnorePatterns`로 `KelpusNative`의 독립 프로젝트를 분리한다.
2. `react-native-linear-gradient` 전용 mock/module mapper를 추가하거나 RN package transform 정책을 보완한다.
3. `webMapsCoverage.test.js`가 실제 파일 `RunningMapView.tsx`를 사용하도록 계약을 바로잡거나 실제 `.web.tsx` 구현을 추가한다.
4. `act(...)` 경고를 제거한 뒤 전체 24 suites를 재실행한다.
5. exit code 0인 동일 snapshot에서 coverage를 다시 생성한다.

### 4.3 커버리지의 한계

높은 수치는 결함 부재를 증명하지 않는다. 현재 자동화는 mock 중심이라 실제 OS permission UI, store 결제 callback, 지도 SDK 렌더링, 외부 LLM/SNS rate limit, 네트워크 지연, 동시 요청 race를 재현하지 않는다. 따라서 정적 검사, 실기기 E2E, 부하 테스트와 함께 해석해야 한다.

---

## 5. 버그 로그

| ID | 심각도 | 상태 | 재현/증상 | 영향 및 권고 |
|---|---|---|---|---|
| BUG-TF-001 | High | Open | root Jest에서 `react-native-linear-gradient/index.js`의 `import`를 변환하지 못해 8개 주요 suite와 App suite가 로드 실패 | UI 회귀 테스트·frontend coverage가 무효. mock 또는 transform 설정 후 즉시 재실행 |
| BUG-TF-002 | High | Open | `webMapsCoverage.test.js`가 없는 `RunningMapView.web`을 import | 지도 web 테스트 4개 미실행. test import 또는 제품 platform 파일 계약 정정 |
| BUG-TF-003 | Medium | Open | root Jest가 `KelpusNative/__tests__`까지 수집하고 nested RN Flow syntax에서 실패 | 두 프로젝트의 Jest 경계가 불명확. roots/project config 분리 |
| BUG-TF-004 | Medium | Watch | `snsModalsCoverage.test.js`에서 Animated state update가 `act(...)` 밖에서 발생한다는 반복 경고 | 현재 assertion은 통과하지만 비결정적/flaky 종료 가능. fake timer와 `act`로 animation flush |
| BUG-TF-005 | Medium | Open | backend `diet/service.py`의 외부 AI 호출 사이 사전/사후 한도 검사 구조에 동시 요청 race 가능성이 남음 | 단일 요청 test는 통과. DB lock/원자적 quota 및 concurrency test 필요 |
| BUG-TF-006 | High | Review | Apple identity token 검증 구현이 서명 검증 대신 payload decode에 의존할 가능성이 기존 정적 검토에서 제기됨 | 인증 위조 위험. provider JWKS signature/aud/iss/exp 검증을 보안 리뷰로 확정 |
| BUG-TF-007 | Low | Watch | Pydantic class-based Config deprecation warning | Pydantic 3 업그레이드 전 `ConfigDict`로 전환 |
| BUG-TF-008 | Low | Watch | passlib `crypt`, python-jose의 naive `utcnow()` deprecation warning | Python/의존성 업그레이드 시 실패 가능. 지원 버전과 교체 일정 관리 |
| BUG-TF-009 | Coverage gap | Open | backend external adapter 4개와 seed가 0%, SNS repository 32% | 전체 목표는 통과했지만 외부 연동·SNS 회귀 탐지력이 낮음 |
| BUG-TF-010 | Test gap | Open | 실제 Health Connect 단말, 결제 sandbox, live AI/SNS, 성능/부하 테스트 미수행 | 릴리즈 전 별도 E2E/인수/성능 gate 필요 |

BUG-TF-001~003은 제품 기능의 실제 고장을 증명한 것이 아니라 **테스트 인프라 결함**이다. 그러나 중요한 suite를 실행 불가능하게 만들어 릴리즈 신뢰도에 직접 영향을 주므로 High/Medium으로 관리한다. BUG-TF-005~006은 아직 동적 재현이 끝나지 않은 정적 위험이며 “확정 수정 완료”로 표시하지 않는다.

---

## 6. AI 생성 테스트 스크립트

저장소에서 AI 생성임을 명시한 `kelpus/src/api/__tests__/diet.api.ai-generated.test.js`를 확인했다. 이 스크립트는 mock API client를 이용해 (1) 현재 backend envelope 계약, (2) legacy non-envelope 호환성, (3) history/quota endpoint 불변성을 회귀 검증한다. 3개 테스트는 이번 실행에서 모두 통과했다.

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
    ).resolves.toMatchObject({id: 'analysis-1', total_calories: 512});

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/diet/analyze', {
      image_url: 'https://cdn.example.com/meals/kimchi-stew.jpg',
      diet_record_id: 'diet-record-1',
    });
  });

  it('keeps legacy non-envelope analysis responses compatible', async () => {
    apiClient.post.mockResolvedValue({
      data: {id: 'legacy-analysis-1', total_calories: 390},
    });

    await expect(
      dietApi.requestAnalysis({image_url: 'https://cdn.example.com/meal.jpg'}),
    ).resolves.toMatchObject({
      id: 'legacy-analysis-1',
      total_calories: 390,
    });
  });

  it('reads analysis history and quota endpoints without mutating backend paths', async () => {
    apiClient.get.mockResolvedValueOnce({data: []});
    apiClient.get.mockResolvedValueOnce({data: {remaining: 2, total: 3}});

    await expect(dietApi.getAnalysisHistory()).resolves.toEqual({data: []});
    await expect(dietApi.getAnalysisCount()).resolves.toEqual({
      data: {remaining: 2, total: 3},
    });

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/diet/history');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/diet/count');
  });
});
```

AI 생성 테스트는 그대로 신뢰하지 않고 사람이 다음 항목을 검토해야 한다: assertion이 요구사항을 검증하는지, mock이 제품 구현을 그대로 복제하지 않는지, 성공 케이스뿐 아니라 오류·경계가 있는지, 테스트 이름과 실제 assertion이 일치하는지. 위 스크립트는 endpoint와 payload 계약에는 유효하지만 timeout/401/402/500과 malformed envelope는 다른 테스트로 보완해야 한다.

---

## 7. 릴리즈 판단과 후속 계획

### 7.1 현재 판단

- **Backend 자동 회귀 gate: PASS.** 92개 test, line 82.15%, branch 75.37%로 정의된 전체 목표를 충족한다.
- **Frontend 자동 회귀 gate: FAIL/BLOCKED.** assertion 실패는 없었지만 suite load failure가 있어 전체 제품 검증과 커버리지 판정이 불가능하다.
- **통합/E2E release gate: 미수행.** 외부 API와 실기기 의존 시나리오는 mock 계약만 검증했다.

따라서 현재 상태를 “전체 릴리즈 가능”으로 승인할 수는 없다. backend는 통과했지만 frontend test infrastructure 정상화와 실기기 핵심 smoke test가 필요하다.

### 7.2 우선순위별 조치

1. **P0—Jest 정상화:** BUG-TF-001~003을 수정하고 24/24 suite가 load 및 실행되도록 한다.
2. **P0—Frontend coverage 재측정:** exit code 0인 run에서 전체 제품 라인/브랜치 수치를 다시 산출한다.
3. **P1—보안/동시성:** Apple token 검증과 AI quota race를 코드 리뷰·동시성 test로 확정한다.
4. **P1—외부 adapter:** Apple/Samsung health, map, SNS repository/crawler test를 추가한다.
5. **P1—실기기 smoke:** Android Health Connect 권한→read→sync→Nutrition write/delete를 한 번 이상 검증한다.
6. **P2—품질 부채:** React `act` 및 Python deprecation warning을 제거한다.
7. **P2—성능/인수:** AI 분석 5초, 피드 2초, 지도 3초 목표를 운영 유사 환경에서 측정한다.

### 7.3 종료 기준

최종 테스트 활동은 다음을 모두 만족할 때 종료한다.

- Backend와 frontend 전체 suite exit code 0
- Backend 80% line/75% branch 이상
- Frontend 70% line/65% branch 이상 또는 미달 항목에 승인된 위험 수용 근거 존재
- High 버그 0개 또는 명시적 release waiver
- Health Connect 및 인증 핵심 실기기/통합 smoke 통과
- 동일 commit/snapshot의 명령·raw report·버그 상태가 CI 산출물로 보존됨

본 결과는 테스트가 도달한 범위를 정량화한 것이며 결함이 없다는 증명이 아니다. 특히 현재는 frontend 전체 suite가 성립하지 않으므로, 이 문서의 가장 중요한 결론은 backend 목표 통과보다도 **frontend 측정의 무효를 숨기지 않고 다음 gate를 명확히 한 것**이다.
