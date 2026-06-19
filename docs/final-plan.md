# Kelpus 최종 종료 기준 달성 계획

> 입력 문서: `docs/test-final.md`  
> 계획 유형: 직접 실행 계획(구현은 본 문서 범위 밖)  
> 기준 리비전: `75a41d7` 및 계획 수립 시점 작업 트리  
> 목표: `test-final.md` §7.3의 여섯 종료 기준을 재현 가능한 증거와 함께 모두 충족

---

## 1. 요구사항 요약

`test-final.md`의 현재 상태는 backend gate만 통과하고 frontend, High 버그, 실기기/통합 smoke, CI 증거 보존이 미완료다(`docs/test-final.md:299-326`). 본 계획은 다음 결과를 만든다.

1. Backend와 frontend의 모든 승인 대상 test suite가 exit code 0으로 종료된다.
2. Backend line 80%/branch 75% 이상을 유지한다.
3. Frontend 전체 제품 분모에서 line 70%/branch 65% 이상을 달성한다. 위험 수용은 예외 절차로만 허용한다.
4. High 버그를 0개로 만들거나, 만료일·승인자가 있는 release waiver를 남긴다.
5. Health Connect와 인증 핵심 smoke를 실제 통합 환경에서 통과시킨다.
6. 동일 commit/snapshot에서 생성한 명령, raw report, bug 상태를 CI artifact로 보존한다.

### 1.1 현재 gap

| Gate | 현재 | 목표 | 근거 |
|---|---|---|---|
| Backend suite | 92 passed | exit 0 유지 | `docs/test-final.md:18`, `82-104` |
| Backend coverage | line 82.15%, branch 75.37% | ≥80%, ≥75% | `docs/test-final.md:150-157` |
| Frontend suite | 14/24 suites pass, 10 load fail | 승인 대상 전체 exit 0 | `docs/test-final.md:129-144`, `173-191` |
| Frontend coverage | 실패 run의 진단값 28.96%/21.42% | 유효 run에서 ≥70%/≥65% | `docs/test-final.md:175-190` |
| High bugs | BUG-TF-001, 002 Open; 006 Review | 0 Open/Review | `docs/test-final.md:201-214` |
| Device/integration smoke | 미수행 | Health Connect+auth pass | `docs/test-final.md:301-325` |
| CI evidence | root workflow 부재 | 동일 snapshot artifact | 기존 workflow는 `kelpus/.github/workflows/ci.yml:1-47`에 있어 저장소 root GitHub Actions workflow로 인식되지 않음 |

### 1.2 범위

**포함**

- Jest project 경계, native mock, web map test/구현 계약 수정
- frontend line/branch gap 분석과 테스트 보강
- Apple identity token 서명·claim 검증
- AI quota 동시성 검증과 필요 시 원자적 갱신
- Android Health Connect 실기기 smoke와 auth provider 통합 smoke
- root CI quality gate, snapshot manifest, raw artifact, bug ledger
- backend 회귀/커버리지 유지 및 경고 정리

**제외**

- 신규 제품 기능, UI 재설계, 요구사항 변경
- 테스트 통과만을 위한 제품 파일의 무근거 coverage 제외
- live 사용자 개인정보·실결제 사용
- 목표 미달 수치를 반올림해 PASS로 간주하는 방식

---

## 2. 실행 원칙

1. **유효성 우선:** suite exit 0, 분모 일치, snapshot 일치 전에는 coverage를 공식 결과로 발행하지 않는다.
2. **제품 분모 고정:** `kelpus/src`의 화면·component·hook·store·API와 platform variant를 포함한다. test, `*.d.ts`, barrel `index.ts`, `src/shims/**` 외 추가 제외는 승인 없이는 금지한다(`docs/test-final.md:60-74`).
3. **실패 원인별 최소 수정:** test infrastructure 결함과 제품 결함을 분리하고, 실패를 skip/forceExit로 숨기지 않는다.
4. **보안 기본 거부:** 검증할 수 없는 Apple token, 만료/issuer/audience 불일치 token은 401로 거부한다.
5. **증거 기반 종료:** 모든 gate는 동일 Git SHA와 content snapshot ID를 가진 raw artifact로 증명한다.

---

## 3. 테스트 가능한 인수 기준

| ID | 인수 기준 | 검증 방법/증거 |
|---|---|---|
| AC-01 | main frontend project의 모든 수집 suite가 실패·skip·open handle 없이 exit 0 | `cd kelpus && npm test -- --runInBand --ci`; Jest JSON result |
| AC-02 | `KelpusNative`가 유지 대상이면 독립 project에서 test exit 0; 폐기 대상이면 코드/설정 제거 결정 기록 | `cd kelpus/KelpusNative && npm test -- --runInBand --ci`; 별도 result 또는 ADR |
| AC-03 | main Jest가 `KelpusNative` suite를 중복 수집하지 않음 | `npx jest --listTests` 결과에 `KelpusNative/` 0건 |
| AC-04 | frontend coverage line ≥70.00%, branch ≥65.00%; raw integer 판정 | `coverage-summary.json`, `coverage-final.json`, exit 0 |
| AC-05 | backend test exit 0, line ≥80.00%, branch ≥75.00% | Pytest JUnit XML + coverage JSON/XML |
| AC-06 | BUG-TF-001, 002, 006이 Closed; High Open/Review 0개 | `docs/test-final.md` 또는 별도 machine-readable bug ledger |
| AC-07 | 위조 Apple token, 잘못된 `kid`, `alg`, `iss`, `aud`, `exp`를 모두 401 처리하고 정상 서명 token만 통과 | backend unit+HTTP integration tests |
| AC-08 | AI quota 경계에서 동시 요청 수가 잔여 횟수를 넘지 않고 저장 row와 사용량이 일치 | 실제 PostgreSQL을 사용한 concurrent integration test 20회 반복 |
| AC-09 | Health Connect 권한→read→backend sync→Nutrition write→delete smoke가 지원 Android 실기기에서 통과 | device/build/OS, 단계별 timestamp, redacted log, 최종 PASS 기록 |
| AC-10 | Google/Kakao/Apple 중 릴리즈 지원 provider의 정상/거부 auth smoke 통과 | sandbox/test token 기반 redacted HTTP evidence |
| AC-11 | root CI가 lint, typecheck, frontend test/coverage, backend test/coverage, evidence validation을 수행 | root `.github/workflows/test-quality.yml` green run URL/ID |
| AC-12 | 모든 최종 report가 동일 `head_sha`, clean/declared dirty state, `snapshot_id`를 참조 | `snapshot.json`, command log, hash manifest |
| AC-13 | artifact에 secret/token/email/Health data 원문이 없음 | artifact secret scan 0 findings |
| AC-14 | waiver 사용 시 owner, 사유, 보상 통제, 만료일, 승인자 2명, 재검증 issue를 포함 | `waivers/*.json`; 하나라도 누락 시 gate 실패 |

기본 목표는 waiver 없이 AC-04와 AC-06을 달성하는 것이다. waiver는 외부 환경 blocker가 반복되고 제품 책임자가 잔여 위험을 명시적으로 수용한 경우에만 사용한다.

---

## 4. 단계별 구현 계획

### Phase 0 — 기준선 고정과 gate 자동화 골격

**목적:** 이후 수치가 서로 다른 작업 트리에서 생성되는 것을 방지한다.

1. `tools/g7_coverage.py`의 snapshot/manifest 기능을 재사용해 backend product, frontend product, tests, configs, lockfile의 path+SHA-256 목록을 생성한다.
2. `.omx/evidence/final-quality/<snapshot-id>/` staging 구조를 만들고 `snapshot.json`, `commands.jsonl`, `bugs.json`, `waivers/`, `runs/`를 정의한다.
3. 현재 backend 성공 run과 frontend 실패 run을 baseline으로 기록하되, frontend 수치는 `measurement_status=invalid`로 둔다.
4. bug ledger에 BUG-TF-001~010의 severity, owner 역할, 상태, 재현 명령, 종료 증거 필드를 등록한다.

**변경 후보**

- `tools/g7_coverage.py`, `tools/tests/test_g7_coverage.py`
- 신규 `tools/final_quality_gate.py`, `tools/tests/test_final_quality_gate.py`
- `.omx/evidence/final-quality/` 실행 산출물

**완료 조건**

- 동일 입력에서 snapshot ID가 결정적이다.
- 실행 도중 product/config hash가 바뀌면 run이 invalid 처리된다.
- invalid frontend 결과가 PASS/FAIL coverage로 렌더링되지 않는다.

### Phase 1 — P0 Frontend Jest 정상화

**목적:** BUG-TF-001~003을 제거하고 모든 main frontend test를 assertion 단계까지 실행한다.

1. `kelpus/package.json:85-122`의 inline Jest 설정을 검토해 main project root를 `kelpus`로 고정하고 `KelpusNative/**`를 명시적으로 제외한다. 별도 `jest.config.js`로 옮길 경우 package 설정을 중복 유지하지 않는다.
2. `react-native-linear-gradient` 전용 결정적 mock을 `kelpus/__mocks__/`에 추가하고 `moduleNameMapper`에 연결한다. transform 범위를 무작정 전체 `node_modules`로 넓히지 않는다.
3. `kelpus/src/__tests__/webMapsCoverage.test.js:6`이 요구하는 `RunningMapView.web.tsx`가 실제로 없음을 해결한다. 이 테스트는 Naver DOM map behavior를 검증하므로 native `RunningMapView.tsx:1-99`로 import만 바꾸지 말고, web counterpart를 구현하거나 web 기능을 공식 제외하는 제품 결정을 기록한다. 기본안은 `RunningMapView.web.tsx` 구현이다.
4. main project와 `KelpusNative`의 Node/RN 버전이 다르므로(`kelpus/package.json:29`, `KelpusNative/package.json:13-39`) install/test job을 분리한다.
5. `--forceExit` 없이 실행하여 open handle을 노출한다. `snsModalsCoverage.test.js`의 Animated warning은 fake timer와 `act()`로 flush한다.

**변경 후보**

- `kelpus/package.json` 또는 신규 `kelpus/jest.config.js`
- 신규 `kelpus/__mocks__/react-native-linear-gradient.js`
- 신규 `kelpus/src/features/running/components/RunningMapView.web.tsx`
- `kelpus/src/__tests__/webMapsCoverage.test.js`
- `kelpus/src/__tests__/snsModalsCoverage.test.js`
- 필요 시 `kelpus/KelpusNative/jest.config.js`

**회귀 순서**

```bash
cd kelpus
npx jest --listTests
npx jest src/__tests__/webMapsCoverage.test.js --runInBand
npx jest src/__tests__/authScreensCoverage.test.js --runInBand
npx jest src/features/diet/screens/DietScreen.test.js --runInBand
npm test -- --runInBand --ci

cd KelpusNative
npm test -- --runInBand --ci
```

**완료 조건:** AC-01~03 충족, BUG-TF-001~004 Closed, warning/error output 0건.

### Phase 2 — Frontend coverage 70/65 달성

**목적:** 전체 suite가 성공한 동일 snapshot에서 공식 frontend coverage를 발행한다.

1. `docs/test-final.md:60-74`의 고정 분모로 clean baseline을 생성한다.
2. file별 uncovered line/branch를 정렬하고 line 또는 branch 목표에 가장 크게 기여하는 제품 파일부터 보강한다.
3. 기존 실패 suite였던 auth, profile, running, feed/SNS, DietScreen, common component의 public behavior assertion을 우선 살린다(`docs/test-final.md:129-144`).
4. gap test는 구현 세부가 아니라 입력, 사용자 표시, navigation/API 호출, reducer state, error fallback을 검증한다.
5. 매 batch 후 전체 Jest를 실행한다. product code 변경은 실제 결함 수정에만 허용하고 coverage만 위한 dead branch/ignore pragma는 금지한다.
6. line 70%, branch 65%를 raw integer 식으로 판정한다: `covered*100 >= target*total`.

**변경 후보**

- `kelpus/src/**/__tests__/**`, `kelpus/src/**/*.test.{js,ts,tsx}`
- `kelpus/__tests__/App.test.tsx`
- coverage config와 `tools/final_quality_gate.py`

**완료 조건:** AC-04 충족, 전체 Jest exit 0, product/test manifest와 raw report hash 보존.

### Phase 3 — High 보안 버그와 quota 동시성 해소

#### 3A. Apple token 검증—BUG-TF-006

1. `backend/app/domains/user/service.py:211-222`의 payload-only decode를 제거한다.
2. Apple JWKS를 HTTPS로 조회하고 `kid`로 public key를 선택한다. 기존 `python-jose[cryptography]`를 우선 사용해 추가 dependency를 피한다.
3. signature와 `alg=RS256`, `iss=https://appleid.apple.com`, configured audience, `exp`를 검증한다. audience 설정을 `backend/app/config.py:17-20` 인근 및 `.env.example`에 추가한다.
4. JWKS timeout/비정상 응답/unknown kid는 fail closed 401로 처리한다. 짧은 TTL cache를 둘 경우 cache miss/rotation test를 포함한다.
5. 실제 token 원문은 log/artifact에 기록하지 않는다.

**테스트:** 정상 서명, tampered payload/signature, expired, wrong issuer/audience/algorithm/kid, JWKS timeout/rotation.

#### 3B. AI quota race—BUG-TF-005

1. `backend/app/domains/diet/service.py:74-158`의 check-then-update 경계를 실제 PostgreSQL 동시성 test로 재현한다.
2. 재현되면 `today_usage < daily_ai_limit` 조건을 포함한 원자적 conditional UPDATE 또는 row lock으로 quota slot을 예약하고, AI 실패 시 slot을 보상/해제하는 transaction 설계를 적용한다.
3. 분석 row 저장과 usage count의 일관성을 보장한다. 외부 AI 호출 동안 장기 DB transaction을 유지하지 않는다.
4. 잔여 1회에서 동시 2~10요청, 날짜 rollover, AI 실패, retry를 반복 검증한다.

**변경 후보**

- `backend/app/domains/user/service.py`, `backend/app/config.py`, `backend/.env.example`
- `backend/app/domains/user/repository.py`
- `backend/app/domains/diet/service.py`, 관련 repository/model
- `backend/tests/test_user_service_coverage.py`
- 신규 `backend/tests/test_apple_token_verification.py`
- 신규 `backend/tests/integration/test_diet_quota_concurrency.py`

**완료 조건:** AC-06~08 충족, backend 전체 gate 유지, High bug 0개.

### Phase 4 — Backend 품질 보강과 경고 제거

**목적:** 이미 통과한 수치를 안정적으로 유지하고 adapter/의존성 부채를 축소한다.

1. 0% adapter와 낮은 SNS/health 모듈(`docs/test-final.md:161-171`)에 성공·빈 결과·외부 실패 계약 test를 추가한다.
2. `backend/app/config.py:46-48`을 `ConfigDict` 방식으로 바꾸어 Pydantic 경고를 제거한다.
3. passlib `crypt`, python-jose `utcnow()` 경고는 dependency 호환성 표와 교체 issue를 만든다. 안전한 patch upgrade로 제거 가능할 때만 lock/requirements를 갱신한다.
4. `seed.py`와 abstract adapter를 runtime coverage 분모에서 제외하려면 실제 실행 경계/별도 script임을 ADR로 입증해야 한다. 목표 편의를 위한 제외는 허용하지 않는다.

**완료 조건:** backend suite/coverage gate 유지, 신규 warning 0건, BUG-TF-007~009 Closed 또는 owner/기한이 있는 accepted backlog.

### Phase 5 — 실기기 및 인증 통합 smoke

**목적:** mock test가 확인하지 못한 OS/provider 경계를 검증한다.

1. 개인정보 없는 전용 QA 계정과 합성 건강 데이터를 준비한다.
2. 지원 Android 기기에서 Health Connect availability/update 상태, 권한 승인/거부, Exercise/Nutrition/Steps/HeartRate read를 확인한다.
3. read 결과를 backend sync API로 전송하고 created/skipped/failed count, 재전송 idempotency를 확인한다.
4. AI 분석 결과를 Nutrition으로 write하고 backend export UUID/version 상태를 확인한 후 delete까지 검증한다.
5. 인증은 지원 provider별 정상 token과 만료/변조 token을 사용해 200/401 경계를 확인한다. Apple은 JWKS rotation/cache path도 staging에서 확인한다.
6. 화면 캡처보다 구조화된 redacted log를 우선 저장하고 token, 이메일, 위치, 건강 수치를 마스킹한다.

**산출물**

- `docs/test-evidence/health-connect-smoke.md`
- `docs/test-evidence/auth-smoke.md`
- device/OS/app SHA, 시작·종료 시간, 단계별 expected/actual, bug link

**완료 조건:** AC-09~10 충족. 실제 기기/credential 부재 시 종료하지 않고 external blocker로 기록하며, waiver는 AC-14를 만족해야 한다.

### Phase 6 — Root CI와 원자적 증거 발행

**목적:** 로컬 성공을 동일 commit에서 재현하고 감사 가능한 artifact로 남긴다.

1. GitHub가 인식하는 저장소 root에 `.github/workflows/test-quality.yml`을 추가한다. 기존 `kelpus/.github/workflows/ci.yml:28-38`의 명령은 root 기준 working directory가 없어 그대로 이전하지 않는다.
2. jobs를 다음과 같이 분리한다.
   - `frontend-main`: Node 20, `working-directory: kelpus`, `npm ci`, typecheck, lint, Jest+coverage
   - `frontend-native`: Node 22.11+, `working-directory: kelpus/KelpusNative`, 독립 install/lint/test
   - `backend`: Python 3.12, runtime+test requirements, Pytest+branch coverage
   - `quality-gate`: 세 job artifact, snapshot, bug ledger, waiver, secret scan 검증
3. 모든 job 시작 전 SHA와 input manifest를 기록하고 종료 후 재계산해 drift를 거부한다.
4. JUnit, Jest JSON, coverage JSON/XML/summary, stdout/stderr, tool versions, `git status`, bug ledger를 staging에 모은다.
5. hash 검증과 secret scan 통과 후 `COMPLETE` marker를 마지막에 생성한다. 실패 run은 `INVALID` marker를 사용한다.
6. artifact retention을 과제 제출/평가 기간 이상으로 설정하고 CI run ID를 최종 보고서에 기록한다.

**완료 조건:** AC-11~14 충족, CI rerun 2회 연속 green, 두 run의 분모/수치가 동일하거나 차이가 설명됨.

### Phase 7 — 최종 판정과 문서 갱신

1. `tools/final_quality_gate.py`가 AC-01~14 결과를 machine-readable JSON으로 계산한다.
2. `docs/test-final.md:14-30`, `148-214`, `297-328`을 최종 동일-snapshot 수치와 bug 상태로 갱신한다.
3. `docs/TESTING.md` §4.6의 `[측정 예정]`을 유효 final 수치와 CI artifact reference로 교체하고 React Native 버전을 0.75.4로 정정한다.
4. waiver가 있으면 만료 후 자동 FAIL이 되도록 gate에 날짜 검증을 둔다.
5. 최종 reviewer가 raw count, suite 수, SHA, bug 상태, smoke evidence를 문서와 대조한다.

**완료 조건:** §8의 stop rule 전부 PASS, 문서와 raw artifact 불일치 0건.

---

## 5. 의존성과 순서

```text
Phase 0 snapshot/gate
  ├─> Phase 1 Jest 정상화 ─> Phase 2 frontend coverage ─┐
  ├─> Phase 3 security/concurrency ─> Phase 4 backend ─┼─> Phase 6 CI ─> Phase 7 판정
  └─> Phase 5 device/auth smoke ───────────────────────┘
```

- Phase 2는 Phase 1의 전체 suite exit 0 이후에만 공식 수치를 만든다.
- Phase 5 auth smoke는 Phase 3A 완료 이후 수행한다.
- Phase 6은 각 lane 결과를 통합하지만, CI workflow 골격은 Phase 0 직후 병행 작성할 수 있다.
- Phase 7 전에는 product/config/test 변경을 freeze하고 새 변경이 생기면 전체 final run을 다시 수행한다.

---

## 6. 위험과 완화책

| 위험 | 영향 | 완화 |
|---|---|---|
| coverage를 높이기 위해 분모를 축소 | 허위 PASS | 허용 제외 목록 고정, manifest diff gate, raw count 검증 |
| native mock이 실제 동작과 괴리 | unit pass/기기 fail | mock contract + Phase 5 실기기 smoke 병행 |
| Apple JWKS/network 불안정 | 로그인 장애 | timeout, bounded cache, key rotation test, fail-closed, 관측 metric |
| quota 해결이 장기 DB lock 유발 | latency/throughput 저하 | 외부 AI 호출 전 lock 금지, atomic reservation+compensation, concurrent load test |
| nested RN 프로젝트 버전 충돌 | CI install/test 실패 | Node/working directory/cache를 별도 job으로 분리 |
| artifact에 token/PHI 포함 | 보안 사고 | 합성 계정, redaction, secret scan, raw body 저장 금지 |
| 실기기/credential 미확보 | AC-09/10 미달 | 일정 초기에 예약; 불가 시 owner·만료가 있는 waiver만 허용 |
| flaky animation/timer | 간헐 CI failure | fake timers, `act`, seed/timezone 고정, 2회 연속 green 요구 |

---

## 7. 검증 명령

```bash
# Backend final
cd backend
.venv/bin/python -m pytest tests \
  --junitxml=../.omx/evidence/final-quality/staging/backend-junit.xml \
  --cov=app --cov-branch \
  --cov-report=json:../.omx/evidence/final-quality/staging/backend-coverage.json \
  --cov-report=xml:../.omx/evidence/final-quality/staging/backend-coverage.xml

# Main frontend final
cd ../kelpus
npx tsc --noEmit
npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0
npx jest --runInBand --ci --coverage \
  --json --outputFile=../.omx/evidence/final-quality/staging/frontend-jest.json

# Nested frontend final (유지 결정 시)
cd KelpusNative
npm test -- --runInBand --ci --json \
  --outputFile=../../.omx/evidence/final-quality/staging/native-jest.json

# Gate/evidence
cd ../..
python tools/final_quality_gate.py verify \
  --evidence .omx/evidence/final-quality/staging \
  --require-backend-lines 80 --require-backend-branches 75 \
  --require-frontend-lines 70 --require-frontend-branches 65 \
  --require-high-bugs 0 --require-smoke health-connect,auth
```

검증기는 반올림 표시가 아니라 integer raw count로 판정하고, suite exit code·snapshot drift·report schema·secret scan 중 하나라도 실패하면 `COMPLETE`를 만들지 않는다.

---

## 8. 최종 Stop Rule

아래 체크가 전부 참일 때만 작업을 종료한다.

- [ ] Backend 승인 대상 suite exit 0
- [ ] Main frontend 승인 대상 suite exit 0, skip 0, open handle 0
- [ ] `KelpusNative` 유지 시 독립 suite exit 0; 제거 시 승인된 ADR 존재
- [ ] Backend line ≥80%, branch ≥75%
- [ ] Frontend line ≥70%, branch ≥65% 또는 AC-14를 만족하는 유효 waiver
- [ ] High bug Open/Review 0개 또는 AC-14 waiver
- [ ] Health Connect 실기기 smoke PASS
- [ ] Auth 통합 smoke PASS
- [ ] 모든 raw report가 동일 SHA/snapshot ID 참조
- [ ] artifact secret scan 0건, hash 검증 PASS, `COMPLETE` 존재
- [ ] root CI 2회 연속 green
- [ ] `docs/test-final.md`와 `docs/TESTING.md`의 수치/상태가 raw evidence와 일치

하나라도 거짓이면 해당 Phase로 돌아가 수정→전체 회귀→evidence 재발행을 반복한다. “로컬에서 한 번 통과”, 실패 suite 제외, 과거 report 재사용, 만료된 waiver는 종료 근거로 인정하지 않는다.

---

## 9. 실행 산출물 목록

| 산출물 | 목적 |
|---|---|
| `docs/final-plan.md` | 본 실행 계획 |
| `.github/workflows/test-quality.yml` | root CI quality gate |
| `tools/final_quality_gate.py` + tests | 수치·snapshot·bug·waiver 검증 |
| `docs/test-evidence/health-connect-smoke.md` | 실기기 smoke evidence |
| `docs/test-evidence/auth-smoke.md` | provider auth evidence |
| `.omx/evidence/final-quality/<snapshot-id>/` | immutable raw reports/manifests/logs |
| `docs/test-final.md` | 최종 실행 결과/버그 로그 |
| `docs/TESTING.md` | 최종 수치가 반영된 테스트 기준서 |

본 계획은 frontend 측정 복구를 가장 먼저 수행하고, 보안·동시성·실기기 경계를 닫은 뒤, 동일 snapshot CI 증거로 종료 여부를 판정한다. 계획의 성공은 문서 작성 완료가 아니라 §8의 모든 checkbox가 객관적 evidence로 참이 되는 상태다.
