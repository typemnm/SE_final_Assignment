# Kelpus 릴리즈 가능 여부 분석 보고서

> 작성 기준일: 2026-06-19 (KST)
> 대상 브랜치: `fix/typemnm/releaseBug`
> 기준 커밋: `7202823` (최종 fix 커밋 포함)
> 연관 문서: `docs/test-final.md`

---

## 1. 이번 브랜치에서 수정한 버그 요약

### 1.1 BUG-TF-001: react-native-linear-gradient ESM transform 실패 (커밋 ec0e151)

**증상:** 8개 이상의 주요 Jest suite가 `react-native-linear-gradient/index.js`의 ESM `import`를 변환하지 못해 로드 단계에서 실패.

**수정 내용:**
- `kelpus/__mocks__/react-native-linear-gradient.js` 생성 — gradient를 flat View로 대체하는 Jest 전용 mock
- `package.json` → `jest.moduleNameMapper`에 `"^react-native-linear-gradient$"` 항목 추가

**결과:** `deterministicCoverage`, `authScreensCoverage`, `snsCardsCoverage`, `feedScreenCoverage`, `profileScreensCoverage`, `runningListCoverage`, `DietScreen.test.js`, `App.test.tsx` 등 8개 suite의 로드 실패 원인 제거.

### 1.2 BUG-TF-002: RunningMapView.web 모듈 누락 (커밋 ec0e151)

**증상:** `webMapsCoverage.test.js`가 존재하지 않는 `RunningMapView.web` 모듈을 import해 4개 테스트가 미실행.

**수정 내용:**
- `kelpus/src/features/running/components/RunningMapView.web.tsx` 생성 — Jest 환경(web)에서 실제 지도 대신 테스트 가능한 stub 컴포넌트 제공

**결과:** `webMapsCoverage.test.js` 4개 assertion 로드 실패 원인 제거.

### 1.3 BUG-TF-003: KelpusNative nested 프로젝트 Jest 수집 충돌 (커밋 ec0e151)

**증상:** root Jest가 `KelpusNative/__tests__`까지 수집하고 해당 프로젝트의 Flow syntax를 변환하지 못해 `KelpusNative/__tests__/App.test.tsx` 로드 실패.

**수정 내용:**
- `package.json` → `jest.testPathIgnorePatterns`에 `/KelpusNative/` 패턴 추가

**결과:** 두 독립 프로젝트의 Jest 경계 분리.

### 1.4 DietScreen 텍스트·showForm·테스트 mock 수정 (커밋 7202823)

`docs/test-final.md`에 기록된 10개 로드 실패 suite 중 `DietScreen.test.js`의 원인은 BUG-TF-001(linear-gradient mock 누락)이었으나, mock 추가 이후에도 컴포넌트 텍스트와 테스트 기대값의 불일치 및 추가 mock 누락으로 assertion이 실패하는 상태였다. 이번 커밋에서 함께 수정했다.

**수정 상세:**

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| backfillSummaryText | `내보내기: 성공 N건, 건너뜀 N건` | `기존 분析 내보내기: 성공 N건, 건너뜀 N건, 실패 N건` |
| permission_required 메시지 | `Health Connect 권한이 필요합니다.` | `Health Connect 영양 쓰기 권한이 필요합니다.` |
| backfill 버튼 텍스트 | `Health Connect 내보내기` | `기존 분析 Health Connect 내보내기` |
| cameraBusy 헬퍼 텍스트 | `사진 업로드 후 AI 분析 요청 중...` (showForm 내부) | `사진 업로드 후 AI 분析을 요청하는 중입니다.` (showForm 외부, 항상 렌더링) |
| DietScreen.test.js | ThemeContext/SafeArea mock 없음, 카메라 버튼 텍스트 불일치, 폼 접근 전 toggle 누락 | mock 추가, 버튼 텍스트 `'📷  카메라로 촬영'`으로 수정, 폼 필요 테스트에 toggle press 추가 |

---

## 2. 수정 후 Frontend suite 로드 상태 (코드 분析 기준)

아래 표는 실제 jest 실행 없이 코드 변경 분析을 기반으로 한 예측이다.

| Suite | 수정 전 상태 | 수정 후 예측 상태 | 근거 |
|---|---|---|---|
| `__tests__/App.test.tsx` | 로드 실패 (linear-gradient) | 로드 성공 가능 | BUG-TF-001 수정 |
| `KelpusNative/__tests__/App.test.tsx` | 로드 실패 (nested, Flow syntax) | 제외됨 | BUG-TF-003 수정 (testPathIgnorePatterns) |
| `deterministicCoverage.test.js` | 로드 실패 (linear-gradient) | 로드 성공 가능 | BUG-TF-001 수정 |
| `authScreensCoverage.test.js` | 로드 실패 (linear-gradient) | 로드 성공 가능 | BUG-TF-001 수정 |
| `snsCardsCoverage.test.js` | 로드 실패 (linear-gradient) | 로드 성공 가능 | BUG-TF-001 수정 |
| `feedScreenCoverage.test.js` | 로드 실패 (linear-gradient) | 로드 성공 가능 | BUG-TF-001 수정, ThemeContext mock 이미 존재 |
| `profileScreensCoverage.test.js` | 로드 실패 (linear-gradient) | 로드 성공 가능 | BUG-TF-001 수정 |
| `runningListCoverage.test.js` | 로드 실패 (linear-gradient) | 로드 성공 가능 | BUG-TF-001 수정 |
| `DietScreen.test.js` | 로드 실패 (linear-gradient) + 텍스트 불일치 | assertion 통과 가능 | BUG-TF-001 + 1.4항 수정 |
| `webMapsCoverage.test.js` | 로드 실패 (RunningMapView.web 없음) | 로드 성공 가능 | BUG-TF-002 수정 |

**이전 통과 suite (14개):** 수정 영향 없이 그대로 통과 예정.

수정 후 예상 실행 가능 suite: **23개** (KelpusNative는 testPathIgnorePatterns로 제외, 실질 대상에서 빠짐).

---

## 3. 잔존 위험 및 미결 사항

### 3.1 실행 전 불확실성 (코드 분析만으로 확인 불가)

| 위험 항목 | 내용 |
|---|---|
| `authScreensCoverage`, `profileScreensCoverage` 등 ThemeContext 의존 | BUG-TF-001 수정 후 로드는 되지만 `useThemeContext` 호출 시 mock 누락 여부를 직접 실행 없이 확인 불가 |
| `deterministicCoverage.test.js` | linear-gradient 외 다른 native 의존이 있을 경우 추가 실패 가능 |
| `act(...)` 비동기 경고 (BUG-TF-004) | `snsModalsCoverage.test.js`의 Animated 상태 업데이트 경고가 flaky 실패로 이어질 수 있음 |
| Frontend coverage 측정값 | 전체 suite 통과 후에만 유효한 라인/브랜치 수치를 산출 가능 |

### 3.2 미수정 버그 (test-final.md 기준)

| ID | 심각도 | 상태 | 설명 |
|---|---|---|---|
| BUG-TF-004 | Medium | Watch | `act(...)` 경고 — 현재 assertion은 통과하나 flaky 가능성 |
| BUG-TF-005 | Medium | Open | backend AI quota race condition — 동시 요청 테스트 미수행 |
| BUG-TF-006 | High | Review | Apple identity token 서명 검증 미확인 — 보안 리뷰 필요 |
| BUG-TF-007 | Low | Watch | Pydantic Config deprecation warning |
| BUG-TF-008 | Low | Watch | passlib/python-jose deprecation warning |
| BUG-TF-009 | Coverage gap | Open | backend external adapter 4개 + seed 0%, SNS repository 32% |
| BUG-TF-010 | Test gap | Open | 실기기 Health Connect, 결제 sandbox, live AI/SNS, 성능/부하 테스트 미수행 |

---

## 4. 릴리즈 준비 상태 판정

### Backend

| 항목 | 결과 | 판정 |
|---|---|---|
| Pytest 전체 suite | 92 passed | PASS |
| Line coverage | 82.15% (목표 80%) | PASS |
| Branch coverage | 75.37% (목표 75%) | PASS |
| High 버그 | BUG-TF-006 (Apple token 검증, 미확정) | 보류 중 |

### Frontend

| 항목 | 수정 전 | 수정 후 예측 | 판정 |
|---|---|---|---|
| Suite 로드 성공 | 14/24 (10 실패) | 23/23 (KelpusNative 제외) 가능 | 실행 후 확인 필요 |
| Assertion 통과율 | 74/74 (실행된 것만) | 전체 assertion 통과 예측 | 실행 후 확인 필요 |
| Line/branch coverage | 측정 무효 | suite 정상화 후 재측정 필요 | 미확정 |

### 종합 판정

**현재 상태: 조건부 릴리즈 가능 (Backend PASS, Frontend 실행 확인 필요)**

- Backend 자동 회귀 gate: **PASS**
- Frontend 자동 회귀 gate: **수정 완료, 실제 jest 실행으로 최종 확인 필요**
- BUG-TF-006 (Apple token 보안): **High 심각도, 릴리즈 전 보안 리뷰 권고**
- 실기기/E2E gate: **미수행** (별도 진행 필요)

다음 조건이 충족되면 Frontend gate를 통과한 것으로 볼 수 있다:

1. `npx jest --runInBand` 결과 exit code 0, 23/23 suite PASS
2. `--coverage` 재측정에서 line 70% / branch 65% 이상 달성
3. BUG-TF-006 Apple token 검증 코드 리뷰 완료 및 High 버그 해소 또는 waiver 승인

---

## 5. 수정 파일 목록 (이번 브랜치 전체)

| 파일 | 변경 유형 | 관련 버그 |
|---|---|---|
| `kelpus/__mocks__/react-native-linear-gradient.js` | 신규 생성 | BUG-TF-001 |
| `kelpus/package.json` (moduleNameMapper, testPathIgnorePatterns) | 수정 | BUG-TF-001, BUG-TF-003 |
| `kelpus/src/features/running/components/RunningMapView.web.tsx` | 신규 생성 | BUG-TF-002 |
| `kelpus/src/features/diet/screens/DietScreen.tsx` | 수정 | 텍스트 불일치 4건 |
| `kelpus/src/features/diet/screens/DietScreen.test.js` | 수정 | mock 누락, 버튼 텍스트, form toggle |
