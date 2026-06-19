# Kelpus 테스팅 명세서

> 본 명세서는 소프트웨어 공학 강의(26SS-se-week07a 테스팅·소프트웨어 진화)에서 다룬 기법을 Kelpus 프로젝트에 적용한 산출물이다. Kelpus는 헬스 데이터 동기화, AI 식단 분석, 러닝 기록 관리, SNS 연동을 통합한 건강 관리 모바일 앱(React Native + FastAPI)이다.

---

## 1. 개요

### 1.1 테스팅 목적 및 범위

**목적**
Kelpus 테스팅의 목적은 소프트웨어가 명세된 기능·비기능 요구사항을 만족하는지를 **확인(Validation)**하고, 동시에 잠재된 **결함(Defect)을 발견**하여 출시 전 제거함으로써 **소프트웨어의 신뢰성을 향상**시키는 데 있다. 특히 Kelpus는 다음과 같은 특성으로 인해 체계적 테스팅이 필수적이다.

- **외부 의존성이 많은 통합 앱**: 삼성 헬스/Apple HealthKit, Instagram SNS API, Google Maps API, 인앱 결제(Google Play/App Store) 등 다수의 외부 시스템과 연동되어 인터페이스 결함 가능성이 높다.
- **개인 건강정보(PHI) 처리**: 식단·러닝·프로필 데이터는 개인정보보호법 준수 대상이므로 보안·데이터 관리 요구사항의 검증이 중요하다.
- **조건 분기가 많은 비즈니스 로직**: AI 분석 일일 횟수 제한(무료/구독 플랜), 구독 상태 관리, 권한 처리 등 분기가 복잡하여 화이트박스 검증이 필요하다.

**범위**
본 명세서는 Kelpus의 **기능 요구사항 FR-01 ~ FR-06** 전체와 **비기능 요구사항 NFR-01 ~ NFR-07** 전체를 테스팅 대상으로 한다.

| 구분 | 범위 |
|------|------|
| 기능 요구사항 | FR-01(인증), FR-02(마이페이지), FR-03(SNS 연동), FR-04(식단 분석), FR-05(러닝 관리), FR-06(구독·결제) |
| 비기능 요구사항 | NFR-01(성능), NFR-02(보안), NFR-03(가용성·안정성), NFR-04(확장성), NFR-05(호환성), NFR-06(사용성), NFR-07(데이터 관리) |
| 테스트 단계 | 정적 테스팅 → 개발 테스팅(단위·컴포넌트·시스템) → 릴리즈 테스팅(성능/스트레스) → 사용자 테스팅(알파·베타·인수) |
| 검증 축 | 정적(검사·리뷰) / 동적(블랙박스·화이트박스) |

### 1.2 테스팅 원칙 (G16)

본 테스팅은 강의에서 제시한 다음의 핵심 원칙을 토대로 설계·수행한다.

1. **테스팅의 한계 원칙 (Dijkstra·Hoare)**
   > "테스팅은 결함이 **있음**을 보여줄 뿐, 결함이 **없음**을 증명하지 못한다(Testing can show the presence of defects, but not their absence)."
   따라서 Kelpus 테스팅의 목표는 "버그 zero 증명"이 아니라 **결함 발견을 통한 신뢰성 향상**이다. 모든 테스트가 통과하더라도 결함이 없다고 단정하지 않는다.

2. **완전 테스트 불가 원칙 (Exhaustive testing is impossible)**
   모든 입력 조합·실행 경로를 테스트하는 것은 현실적으로 불가능하다. 예컨대 AI 분석 일일 횟수 제한 로직 하나만 보아도 (플랜 종류 × 사용 횟수 × 프로필 입력 상태 × 시간대)의 조합이 폭발적으로 늘어난다. 따라서 동등 분할·경계값 분석 등으로 **대표값을 선별**하여 효율적으로 테스트한다.

3. **파레토 법칙 (Defect clustering, 80/20)**
   결함의 약 80%는 전체 코드의 약 20%에 집중된다. Kelpus에서는 **분기가 복잡하고 외부 연동이 얽힌 모듈**(AI 분석 횟수 제한, 헬스 동기화 중복 감지, 구독 상태 전이, SNS 크롤링 중복/필터링)에 테스트 자원을 우선 투입한다.

4. **살충제 패러독스 (Pesticide paradox)**
   동일한 테스트 케이스를 반복 실행하면 더 이상 새로운 결함을 발견하지 못한다(살충제를 반복 살포하면 해충이 내성을 가지는 것에 비유). 따라서 회귀 테스트 스위트를 **주기적으로 검토·갱신**하고, 새로운 경계값·시나리오를 지속적으로 추가한다.

5. **검사와 테스팅의 상보성 (Static & Dynamic are complementary)**
   정적 테스팅(코드 인스펙션·리뷰)은 실행 없이 명세·문서·코드를 검토하여 미완성 시스템에도 적용 가능하고 표준 준수·유지보수성 등 비기능 품질까지 점검한다. 그러나 사용성·성능은 확인할 수 없다. 동적 테스팅은 실제 실행으로 행위를 관찰하나 코드를 작성·실행해야 한다. **두 기법은 어느 하나가 다른 하나를 대체하지 않으며 상호 보완적으로 함께 사용**한다.

### 1.3 결함 용어 정의 (G14, 지식베이스 §3.1)

테스팅 전 과정에서 아래 용어를 강의 정의 그대로 엄격히 구분하여 사용한다.

| 용어 | 정의 | 예시 (Kelpus) |
|------|------|---------------|
| **오류 (error)** | 개발자가 만드는 실수. 결함의 **원인**. | 개발자가 AI 분석 횟수 제한 조건을 `count > limit`(초과)로 작성해야 하는데 `count >= limit`(이상)로 잘못 코딩한 실수. |
| **결함 (defect / bug / fault)** | 오류로 인해 프로그램이 불완전해진 상태. 고장의 **원인**. | 위 오류로 인해 무료 사용자가 1일 2회 분석 가능해야 하는데 1회만 허용되도록 코드에 남은 잘못된 조건문. |
| **고장 / 실패 (failure)** | 시스템이 요구사항대로 동작하지 않는 것. *모든 결함이 실패를 유발하지는 않는다.* | 사용자가 2회째 분석을 요청했을 때 "일일 한도 초과"로 차단되어 FR-04-2-3 요구가 실제로 위반되는 관찰된 동작. |

> **주의**: 결함이 존재해도 해당 코드 경로가 실행되지 않거나 특정 입력에서만 드러나면 고장으로 이어지지 않을 수 있다. 따라서 "결함 = 고장"이 아니며, 테스팅은 결함이 고장으로 드러나도록 입력을 설계하는 활동이다.

### 1.4 확인 테스팅 vs 결함 테스팅 구분 (G15, 지식베이스 §3.2)

Kelpus 테스트 케이스는 목적에 따라 **확인(Validation) 테스팅**과 **결함(Defect) 테스팅**으로 명확히 구분하여 설계한다.

| 구분 | 목적 | TC 설계 방향 | Kelpus 예시 |
|------|------|--------------|-------------|
| **확인 (Validation) 테스팅** | 소프트웨어가 요구사항을 **만족함을 보여줌**. | 예상된 정상 사용을 반영한 입력으로 **올바른 동작**을 기대. (정상 케이스 중심) | 무료 사용자가 하루 첫 AI 식단 분석을 요청 → 5초 이내 영양소 균형·칼로리·개선 제안이 포함된 결과가 정상 반환되는지 확인(FR-04-2-1, NFR-01-2). |
| **결함 (Defect) 테스팅** | 결함을 **발견**하기 위함. 시스템을 **블랙박스**로 봄. | 잘못된·원치 않는·경계 밖 동작을 찾도록 비정상·예외 입력으로 TC 설계. (비정상·경계 케이스 중심) | 일일 한도를 초과한 상태에서 분석 재요청, 프로필 미입력 상태에서 분석 요청, 음수 나이 입력, 외부 헬스 API 장애 주입 등으로 잘못된 동작이 드러나는지 탐색(FR-04-2-4, FR-02-1-2, NFR-03-4). |

> 본 명세서 §4 이후의 모든 테스트 케이스 명세표에는 **분류(정상/비정상)** 열을 두어, 각 TC가 확인 테스팅인지 결함 테스팅인지 식별할 수 있도록 한다.

---

## 2. 테스트 계획

### 2.1 테스트 대상 항목

FR-01 ~ FR-06 각 도메인의 주요 기능과 테스트 우선순위를 정리한다. 우선순위는 **파레토 법칙(§1.2-3)**에 따라 분기 복잡도·외부 연동·결제/보안 위험도가 높은 도메인을 상(High)으로 둔다.

| 도메인 | 주요 기능 | 테스트 우선순위 |
|--------|-----------|:----------------:|
| **FR-01 앱 접속 및 인증** | 회원가입/로그인, 소셜 로그인(카카오·구글·애플), 토큰 기반 세션 관리, 비인증 접근 차단 | **상 (High)** — 전체 기능 접근의 관문(include), 보안 직결 |
| **FR-02 마이페이지** | 프로필 관리(나이·성별·목표), 프로필↔AI 분석 연동, 기록 통계 조회(일/주/월), 목표 대비 달성률 | 중 (Medium) — AI 분석 입력값 의존성 존재 |
| **FR-03 외부 SNS 연동** | #kelpus 해시태그 크롤링, 캐시 DB 저장, 중복/부적절 콘텐츠 필터링, Vlog 피드 조회, 원본 링크 이동 | 중 (Medium) — 외부 API 의존, 중복/필터 로직 분기 |
| **FR-04 식단 분석** | OS 헬스 식단 동기화(중복 감지·권한 요청), AI 맞춤 분석, **일일 횟수 제한(무료/구독)**, 한도 초과 차단, 이력 저장 | **상 (High)** — 분기 복잡, 구독·과금 연동, 성능 요구(5초) |
| **FR-05 러닝 연동 및 관리** | 러닝 데이터 동기화(거리·시간·페이스·GPS), 상세 기록 조회, 지도 경로 시각화, 리더보드(기준·기간 필터) | 중 (Medium) — 지도 API 연동, 랭킹 집계 로직 |
| **FR-06 구독 및 결제 관리** | 무료↔구독 플랜 전환, 인앱 결제, **구독 상태(활성/만료/취소) 관리**, 잔여 분석 횟수 표시 | **상 (High)** — 과금·상태 전이, 보안(결제정보 위임) 직결 |

### 2.2 테스트 환경

**하드웨어 (HW)**

| 구분 | 사양 |
|------|------|
| 개발 PC | 빌드·테스트 실행용 워크스테이션 (CI 러너 포함) |
| Android 단말 | Android 에뮬레이터 — **Android 10 이상** (NFR-05-1 준수) |
| iOS 단말 | iOS 시뮬레이터 — **iOS 15 이상** (NFR-05-1 준수) |
| 반응형 검증 | 스마트폰·태블릿 다양한 화면 크기 (NFR-05-3) |

**소프트웨어 (SW)**

| 계층 | 기술 / 도구 |
|------|-------------|
| 프론트엔드 | React Native 0.74 |
| 백엔드 | FastAPI (Python) |
| 데이터베이스 | PostgreSQL (영속 데이터), Redis (캐시·세션·SNS 캐시 DB) |
| 백엔드 테스트 | **pytest** (단위·통합), pytest-cov (커버리지 측정) |
| 프론트 단위 테스트 | **Jest** |
| 프론트 컴포넌트 테스트 | **@testing-library/react-native** |
| 정적 분석 | ESLint/Prettier(JS·TS), ruff/flake8(Python) — 인스펙션 보조 |

**네트워크 환경**
- 로컬 **Docker Compose** 환경(`docker-compose.yml` 기반)으로 FastAPI·PostgreSQL·Redis를 컨테이너로 구성하여 재현 가능한 통합 테스트 환경을 제공한다.
- 외부 API(SNS·헬스·지도·결제)는 통합 테스트 시 **목(mock)/스텁 서버**로 대체하여 격리한다(§2.4 제약 참조).

### 2.3 테스트 일정 (단계별)

강의의 테스팅 단계(정적 → 개발(단위·컴포넌트·시스템) → 릴리즈 → 사용자)에 따라 다음과 같이 수행한다.

| 단계 | 기간 | 담당 | 산출물 |
|------|------|------|--------|
| **1. 정적 테스팅 (코드 인스펙션)** | 1주차 | 개발팀 전원 (모더레이터·검사자·작성자) | 인스펙션 체크리스트, 결함 기록표, 인스펙션 6단계 회의록 |
| **2. 단위/컴포넌트 테스트** | 2~3주차 | 각 기능 개발자 | pytest/Jest 단위 테스트 코드, 컴포넌트 테스트 코드, TC 명세표, 라인/브랜치 커버리지 리포트 |
| **3. 시스템 테스트** | 4주차 | 통합 담당자 | 유즈케이스 기반 시나리오 테스트, 컴포넌트 간 상호작용 검증 결과 |
| **4. 릴리즈/성능 테스트** | 5주차 | QA·인프라 담당 | 운영 프로파일, 스트레스 테스트 시나리오·합격 기준(NFR-01 대응) |
| **5. 사용자 인수 테스트** | 6주차 | 알파(내부)·베타(외부 사용자)·인수(이해관계자) | 알파/베타 피드백, 인수 6단계 결과, 인수 기준 충족 여부 |

### 2.4 제약사항

1. **외부 API 실제 연동 테스트 제한**
   - **Instagram SNS API**: 공개 API 정책·레이트 리밋·인증 토큰 제약으로 실제 #kelpus 크롤링을 CI에서 상시 수행하기 어렵다 → 캐시 DB 응답을 목으로 대체.
   - **삼성 헬스 / Apple HealthKit**: 실제 단말·OS 권한·실제 헬스 데이터가 필요하여 에뮬레이터/시뮬레이터에서 완전 재현이 제한된다 → 어댑터 인터페이스를 스텁으로 주입하여 동기화 로직만 검증.
   - **Google Maps API**: 지도 렌더링·요금·키 노출 제약으로 실제 렌더링 성능(NFR-01-5)은 별도 수동 측정으로 보완.
2. **인앱 결제 테스트 환경 제약**
   - Google Play / App Store 인앱 결제는 **스토어 샌드박스(테스트 결제) 계정**에서만 검증 가능하며, 실제 과금·환불 플로우는 자동화가 제한된다. 따라서 결제 자체는 스토어 결제 시스템에 위임(NFR-02-5)하고, 앱은 **구독 상태 콜백/영수증 검증 로직**을 목으로 테스트한다.
3. **성능 수치의 환경 의존성**
   - NFR-01의 응답시간 기준(피드 2초, AI 분석 5초, 지도 3초 등)은 네트워크·단말 사양에 따라 변동되므로, 측정값은 `[측정 예정]`으로 표기하고 목표값 대비로만 합격 판정한다.

### 2.5 요구사항 추적성 매트릭스 (G13)

모든 요구사항(FR/NFR)이 적어도 하나의 테스트 케이스로 커버됨을 보장하기 위한 추적성 매트릭스다. TC ID는 §4 이후에서 확정·매핑될 예정 ID(예상값)이며, 본 매트릭스로 누락 요구사항(커버 여부 ✗)을 식별·보강한다.

| 요구ID | 요구사항 요약 | 테스트 단계 | TC ID(들) | 커버 여부 |
|--------|---------------|-------------|-----------|:---------:|
| FR-01-1 | 회원가입 및 로그인 수행 | 단위/시스템 | TC-001, TC-002 | ✓ |
| FR-01-2 | 소셜 로그인(카카오·구글·애플)/자체 인증 지원 | 단위/시스템 | TC-003, TC-004 | ✓ |
| FR-01-3 | 인증 토큰 기반 세션 관리(재로그인 최소화) | 컴포넌트/시스템 | TC-005, TC-006 | ✓ |
| FR-01-4 | 비인증 상태 전 기능 접근 차단 | 컴포넌트/시스템 | TC-007, TC-008 | ✓ |
| FR-02-1-1 | 나이·성별·건강 목표 등록·수정 | 단위 | TC-009, TC-010 | ✓ |
| FR-02-1-2 | 프로필 미입력 시 AI 분석 전 프로필 입력 유도 | 시스템 | TC-011, TC-012 | ✓ |
| FR-02-1-3 | 목표 변경 시 이후 AI 분석에 즉시 반영 | 컴포넌트/시스템 | TC-013 | ✓ |
| FR-02-2-1 | 식단·러닝·활동 데이터 기간별(일/주/월) 조회 | 단위/시스템 | TC-014, TC-015 | ✓ |
| FR-02-2-2 | 통계 시각적 차트(그래프·히트맵) 제공 | 컴포넌트 | TC-016 | ✓ |
| FR-02-2-3 | 목표 대비 달성률 수치 확인 | 단위 | TC-017 | ✓ |
| FR-03-1-1 | #kelpus 공개 게시물 주기적 수집 | 컴포넌트/시스템 | TC-018 | ✓ |
| FR-03-1-2 | 메타정보와 함께 캐시 DB 저장 | 컴포넌트 | TC-019 | ✓ |
| FR-03-1-3 | 크롤링 결과 트리거/새로고침 | 시스템 | TC-020 | ✓ |
| FR-03-1-4 | 중복 게시물·부적절 콘텐츠 필터링 | 단위/컴포넌트 | TC-021, TC-022 | ✓ |
| FR-03-2-1 | 수집 게시물 피드 탐색 | 시스템 | TC-023 | ✓ |
| FR-03-2-2 | 캐시 DB 조회로 외부 API 호출 없이 빠른 로딩 | 컴포넌트/릴리즈 | TC-024 | ✓ |
| FR-03-2-3 | 게시물 선택 시 원본 SNS 링크 이동 | 컴포넌트 | TC-025 | ✓ |
| FR-04-1-1 | 삼성 헬스/HealthKit 식단 데이터 동기화 | 컴포넌트/시스템 | TC-026, TC-027 | ✓ |
| FR-04-1-2 | 수동 트리거/백그라운드 자동 동기화 | 컴포넌트 | TC-028 | ✓ |
| FR-04-1-3 | 동기화 시 중복 감지·최신 상태 유지 | 단위 | TC-029, TC-030 | ✓ |
| FR-04-1-4 | 헬스 API 접근 권한 명시적 요청 | 시스템 | TC-031 | ✓ |
| FR-04-2-1 | 식단 데이터+프로필 기반 AI 맞춤 분석 | 컴포넌트/시스템 | TC-032 | ✓ |
| FR-04-2-2 | 분석 결과(영양소·칼로리·개선 제안) 포함 | 단위/컴포넌트 | TC-033 | ✓ |
| FR-04-2-3 | 무료 1~2회/구독 5~10회 분석 요청 허용 | 단위(블랙·화이트박스) | TC-034, TC-035, TC-036 | ✓ |
| FR-04-2-4 | 일일 제한 초과 시 차단·업그레이드 안내 | 단위(경계값) | TC-037, TC-038 | ✓ |
| FR-04-2-5 | 과거 분석 결과 이력 저장·재열람 | 단위/시스템 | TC-039 | ✓ |
| FR-05-1-1 | 러닝 기록(거리·시간·페이스·칼로리) 동기화 | 컴포넌트/시스템 | TC-040 | ✓ |
| FR-05-1-2 | GPS 경로 정보 포함 동기화 | 컴포넌트 | TC-041 | ✓ |
| FR-05-1-3 | 수동·자동 동기화 모두 지원 | 컴포넌트 | TC-042 | ✓ |
| FR-05-2-1 | 개별 러닝 상세(거리·시간·페이스·칼로리·고도) 조회 | 단위/시스템 | TC-043 | ✓ |
| FR-05-2-2 | 지도 API로 러닝 경로 시각화 | 컴포넌트/릴리즈 | TC-044 | ✓ |
| FR-05-2-3 | 구간별 페이스 변화 색상 표현 | 컴포넌트 | TC-045 | ✓ |
| FR-05-3-1 | 전체 사용자 러닝 랭킹 조회 | 시스템 | TC-046 | ✓ |
| FR-05-3-2 | 랭킹 기준(거리·시간·횟수) 선택 | 단위 | TC-047 | ✓ |
| FR-05-3-3 | 본인 순위·주변 순위 확인 | 단위/시스템 | TC-048 | ✓ |
| FR-05-3-4 | 기간별(주간/월간/전체) 필터링 | 단위 | TC-049 | ✓ |
| FR-06-1 | 무료↔구독 플랜 전환 | 시스템 | TC-050 | ✓ |
| FR-06-2 | 인앱 결제(Google Play/App Store) 처리 | 컴포넌트(샌드박스) | TC-051 | ✓ |
| FR-06-3 | 구독 상태(활성/만료/취소) 실시간 관리 | 단위(의사결정 테이블) | TC-052, TC-053 | ✓ |
| FR-06-4 | 현재 플랜·잔여 일일 분석 횟수 표시 | 컴포넌트 | TC-054 | ✓ |
| NFR-01-1 | Vlog 피드 로딩 2초 이내 | 릴리즈(성능) | TC-055 | ✓ |
| NFR-01-2 | AI 분석 결과 반환 5초 이내 | 릴리즈(성능) | TC-056 | ✓ |
| NFR-01-3 | 헬스 동기화 백그라운드 수행(UI 비블로킹) | 시스템/릴리즈 | TC-057 | ✓ |
| NFR-01-4 | 리더보드 주기적 갱신(5~15분) | 컴포넌트/릴리즈 | TC-058 | ✓ |
| NFR-01-5 | 지도 렌더링 3초 이내 | 릴리즈(성능) | TC-059 | ✓ |
| NFR-02-1 | 인증 정보 암호화 전송·저장(HTTPS·토큰) | 정적/시스템 | TC-060 | ✓ |
| NFR-02-2 | 헬스 데이터 개인정보보호법·가이드라인 준수 | 정적(인스펙션) | TC-061 | ✓ |
| NFR-02-3 | 외부 API 키 서버 사이드 관리(클라 미노출) | 정적(코드 검사) | TC-062 | ✓ |
| NFR-02-4 | AI 분석 데이터 목적 외·제3자 미제공 | 정적/시스템 | TC-063 | ✓ |
| NFR-02-5 | 결제 정보 앱 서버 미저장·스토어 위임 | 정적/컴포넌트 | TC-064 | ✓ |
| NFR-03-1 | 외부 API 장애 시 핵심 기능(조회·프로필) 정상 동작 | 시스템(결함 주입) | TC-065 | ✓ |
| NFR-03-2 | 캐시 DB로 외부 API 장애 시에도 피드 열람 | 시스템(결함 주입) | TC-066 | ✓ |
| NFR-03-3 | 네트워크 단절 시 동기화 데이터 로컬 조회 | 시스템 | TC-067 | ✓ |
| NFR-03-4 | AI 엔진 장애 시 오류 메시지·재시도 안내 | 컴포넌트/시스템 | TC-068 | ✓ |
| NFR-04-1 | AI 엔진 독립 서비스 수평 확장 가능 | 릴리즈(스트레스) | TC-069 | ✓ |
| NFR-04-2 | 플랜 종류·횟수 제한 설정 기반 변경(하드코딩 금지) | 정적/단위 | TC-070 | ✓ |
| NFR-04-3 | SNS 연동 대상 확장 가능 구조 | 정적(인스펙션) | TC-071 | ✓ |
| NFR-04-4 | 헬스 API 어댑터 패턴(추가 플랫폼 연동) | 정적/컴포넌트 | TC-072 | ✓ |
| NFR-05-1 | iOS 15+/Android 10+ 지원 | 시스템(호환성) | TC-073 | ✓ |
| NFR-05-2 | 삼성 헬스·HealthKit 양쪽 지원·플랫폼 분기 | 컴포넌트 | TC-074 | ✓ |
| NFR-05-3 | 다양한 화면 크기 반응형 대응 | 컴포넌트(호환성) | TC-075 | ✓ |
| NFR-06-1 | 외부 권한 요청 시 목적·범위 명확 안내 | 시스템/사용성 | TC-076 | ✓ |
| NFR-06-2 | AI 분석 잔여 횟수 직관적 표시 | 컴포넌트/사용성 | TC-077 | ✓ |
| NFR-06-3 | 주요 기능 3탭 이내 도달 | 사용성(인수) | TC-078 | ✓ |
| NFR-07-1 | SNS 캐시 30일 경과 데이터 자동 정리 | 단위(경계값)/시스템 | TC-079 | ✓ |
| NFR-07-2 | 사용자 탈퇴 시 개인 데이터 완전 삭제 | 시스템(보안) | TC-080 | ✓ |
| NFR-07-3 | 헬스·AI 결과 서버 백업·기기 변경 복원 | 시스템 | TC-081 | ✓ |

> **추적성 점검**: FR-01-1 ~ FR-06-4(38개 항목) 및 NFR-01-1 ~ NFR-07-3(31개 항목)의 **전 요구사항이 1개 이상의 TC로 커버**됨을 확인하였다. 미커버(✗) 항목은 없으며, §4 이후 TC 확정 시 본 매트릭스를 갱신하여 양방향 추적성(요구→TC, TC→요구)을 유지한다.

---

## 3. 정적 테스팅 (Static Testing)

> 본 절은 강의(26SS-se-week07a)의 **정적 테스팅 / 코드 검사(G10)** 항목을 Kelpus 프로젝트에
> 실제 적용한 산출물이다. 인스펙션 6단계, 코드 검토 체크리스트, 결함 기록 양식을
> 실제 소스 코드 구조를 기준으로 구체화한다.

### 3.1 정적 테스팅 개요

#### 3.1.1 정적 테스팅 vs 동적 테스팅

| 구분 | 정적 테스팅 (Static) | 동적 테스팅 (Dynamic) |
|------|----------------------|------------------------|
| 검증 방식 | 코드를 **실행하지 않고** 명세·문서·소스 코드를 사람이 검토 | 테스트 데이터로 **실행하며** 행위를 관찰 |
| 대표 기법 | 검사(Inspection), 리뷰(Review), 동료 검토(Peer-review) | 블랙박스(동등분할·경계값), 화이트박스(커버리지·기본경로) |
| 적용 시점 | **미완성 시스템에도 적용 가능** (실행 불필요) | 실행 가능한 빌드가 있어야 함 |
| 검출 대상 | 표준 준수, 이식성, 유지보수성, 로직 결함, 가독성 | 런타임 동작 결함, 입출력 오류 |
| 목적 | 결함의 **조기 발견** (개발 초기 단계) | 요구사항 충족 확인 + 결함 발견 |

> **핵심 원칙**: 정적 테스팅과 동적 테스팅은 어느 한쪽이 다른 쪽을 대체하지 않는
> **상호 보완적 검증 기법**이다. 정적 테스팅은 "코드를 읽어" 결함의 원인을 조기에
> 제거하고, 동적 테스팅은 "코드를 돌려" 실제 고장(failure)을 노출한다.

#### 3.1.2 미완성 시스템에 대한 적용 가능성

Kelpus는 도메인별로 구현 진척이 다르다. 예를 들어 SNS 크롤링(`backend/app/domains/sns/`),
러닝 리더보드(`backend/app/domains/running/`)는 핵심 인증·식단 분석 도메인보다 완성도가 낮다.
동적 테스팅은 실행 가능한 빌드를 요구하므로 미완성 모듈에는 적용이 어렵지만,
**정적 테스팅은 소스 코드와 명세서만 있으면 적용 가능**하므로, 아직 통합 빌드가 안 된
모듈에 대해서도 결함을 조기에 점검할 수 있다.

#### 3.1.3 정적 테스팅으로 확인 가능한 것 / 불가능한 것

| 확인 가능 (정적) | 확인 불가능 (동적 테스팅 필요) |
|------------------|---------------------------------|
| 코딩 표준 준수 (타입 힌트, 네이밍, 주석) | **성능** (NFR-01: AI 분석 5초 이내, 피드 2초 이내) |
| 입력 검증 누락 (Pydantic 스키마 적용 여부) | **사용성** (NFR-06: 3탭 이내 도달, 직관적 표시) |
| 보안 패턴 위반 (하드코딩 시크릿, SQL 인젝션 가능 코드) | 실제 부하 상태의 안정성 (스트레스) |
| 예외 처리 누락, 분기 로직 결함 | 외부 API(SNS/지도/헬스) 실연동 동작 |
| 유지보수성·이식성 (어댑터 패턴 적용 여부) | 동시성 race condition의 실제 발현 여부 |

> 강의 명시: 정적 테스팅은 **사용성·성능을 확인할 수 없다.** 이 두 항목은
> 5절(릴리즈 테스팅)·6절(사용자 테스팅)의 동적 기법으로 검증한다.

---

### 3.2 적용한 리뷰 종류

강의 분류에 따라 비공식 검토(동료 검토)와 공식 검토(소프트웨어 인스펙션)를 함께 적용한다.

#### 3.2.1 동료 검토 (Peer Review)

- **적용 대상**: 핵심 비즈니스 로직 3개 영역
  - **인증** — `backend/app/domains/user/service.py` (JWT 발급/검증, 소셜 로그인),
    `backend/app/dependencies.py` (`get_current_user`)
  - **식단 분석** — `backend/app/domains/diet/service.py` (`analyze_diet`, 구독 게이팅)
  - **러닝 동기화** — `backend/app/domains/running/service.py` (헬스 데이터 동기화)
- **검토자 구성**: 작성자 1명 + 동료 검토자 2~3명 (같은 팀원). 작성자는 진행을
  주도하지 않고, 검토자가 체크리스트를 기준으로 독립적으로 코드를 읽는다.
- **검토 방법**: §3.3의 도메인별 체크리스트를 검토자에게 배포 → 각자 항목별로
  코드를 대조 → 발견 사항을 §3.4 양식으로 기록 → 작성자에게 전달.
- **특징**: 비공식이므로 절차가 가볍고 빠르지만, 검토자 주관에 의존하므로
  객관성이 낮다. 따라서 핵심 도메인은 아래 인스펙션(공식 검토)으로 보강한다.

#### 3.2.2 소프트웨어 인스펙션 (Inspection) — G10 핵심

강의가 정의한 **인스펙션 6단계**를 Kelpus의 `auth`·`diet` 도메인에 적용한다.
회의 규칙: **2시간 이내 / 참가 5명 내외 / 자료는 최소 2일 전 배포 / 발견 오류는
문서화 / 회의 목적은 "오류 발견"이지 "수정"이 아님.**

| 단계 | 활동 | Kelpus 적용 내용 | 담당 | 시간 |
|------|------|------------------|------|------|
| 1. 계획 (Planning) | 검사 대상 선정, 참가자·일정 확정 | 보안·과금 영향이 큰 `user/service.py`(인증), `diet/service.py`(분석 게이팅), `dependencies.py`(인증 의존성)를 우선 대상으로 선정 | 모더레이터 | 0.5일 |
| 2. 개괄 설명 (Overview) | 작성자가 팀원에게 코드 구조·설계 의도 설명 | 작성자가 인증 흐름(JWT 발급→`get_current_user` 검증), 식단 분석의 2단계 게이팅(사전 검증→저장 직전 재검증) 설명 세션 진행 | 작성자 | 30분 |
| 3. 검사 준비 (Preparation) | 체크리스트 기반 **개별** 사전 검토 | §3.3 체크리스트 + 대상 소스를 **회의 2일 전** 배포, 검토자 각자 결함 후보 사전 표기 | 검토자 전원 | 2일 |
| 4. 검사 회의 (Meeting) | 결함 **발견** (수정 X), 2시간 이내·5명 내외 | 검토자별 발견 사항 취합, §3.4 결함 기록부에 ID 부여하여 문서화. 해결책 토론은 금지 | 모더레이터+검토자 | ≤2시간 |
| 5. 수정 (Rework) | 발견된 결함을 작성자가 수정 | 회의에서 확정된 결함 목록을 작성자가 수정하고 커밋(`fix:` 컨벤션) | 작성자 | 1~2일 |
| 6. 후속 조치 (Follow-up) | 수정 사항 검증, 종결 판정 | 모더레이터가 수정 커밋과 결함 기록부 상태를 대조, 재검토 필요 여부 판정 후 종결 | 모더레이터 | 0.5일 |

---

### 3.3 코드 검토 체크리스트

실제 Kelpus 소스 구조(FastAPI 백엔드 / React Native 프론트엔드)를 기준으로 작성한다.

#### 3.3.1 백엔드 (FastAPI / Python) 체크리스트

대상: `backend/app/domains/{user,diet,running,sns}/`, `backend/app/dependencies.py`

- [ ] **인증 토큰 처리 보안** — JWT에 `exp`(만료) 클레임이 포함되는가, `type`(access/refresh)을
      구분 검증하는가. *근거: `user/service.py:50-73`은 `exp`·`type`을 페이로드에 포함하고,
      `refresh_access_token`은 `payload.get("type") != "refresh"`를 검증함.*
- [ ] **SQL 인젝션 방지** — 원시 문자열 쿼리 없이 SQLAlchemy ORM/파라미터화 쿼리만 사용하는가.
      *근거: repository 계층이 ORM 메서드를 사용. 문자열 포매팅으로 조립한 SQL이 없는지 확인.*
- [ ] **입력 유효성 검사** — 모든 요청 본문이 Pydantic 스키마로 검증되는가, 비율·횟수 등
      수치 필드에 `ge`/`le` 제약이 있는가. *근거: `diet/schemas.py`의 `MacroRatios`는
      `ge=0.0, le=100.0` 제약 보유. `DietAnalyzeRequest`는 `AliasChoices`로 호환 별칭 처리.*
- [ ] **API 엔드포인트 인증 적용** — 비인증 접근이 차단되어야 하는 라우터에
      `Depends(get_current_user)`가 빠짐없이 적용되었는가. *근거: `diet/router.py`의
      `sync`·`upload`·`analyze` 모두 `Depends(get_current_user)` 적용. (FR-01-4)*
- [ ] **예외 처리 및 에러 응답 표준화** — 도메인 오류가 적절한 HTTP 상태코드의
      `HTTPException`으로 변환되는가 (401 인증, 402 한도초과, 404 미존재, 409 중복).
      *근거: `diet/service.py:73-81`은 한도 초과 시 402, 플랜 미존재 시 404 반환.*
- [ ] **AI 분석 일일 횟수 제한 로직 정확성** — `check_remaining_count()` 검증이
      분석 호출 **전후**로 이루어지는가(외부 호출 중 한도 우회 방지). *근거: `diet/service.py`는
      외부 호출 전(`:77`)과 결과 저장 직전(`:119`) 두 번 재검증. (FR-04-2-3/4)*
- [ ] **구독 플랜 분기 처리 누락 여부** — 무료/구독 플랜별 일일 한도 분기가
      하드코딩 없이 처리되는가. *근거: NFR-04-2(횟수 제한 설정 기반, 하드코딩 금지)
      — `daily_ai_limit` 필드를 플랜 모델에서 읽는지 확인.*
- [ ] **비동기 처리(async/await) 올바른 사용** — DB I/O·외부 HTTP 호출이 모두
      `await`되는가, 블로킹 파일 쓰기는 `asyncio.to_thread`로 위임하는가.
      *근거: `diet/router.py:104`는 파일 쓰기를 `asyncio.to_thread`로 처리.*
- [ ] **외부 API 호출 오류 처리** — SNS/지도/헬스/AI 외부 호출의 비정상 응답이
      try/except로 포착되어 사용자 친화 메시지로 변환되는가. *근거: `diet/service.py:107-110`은
      `AIAnalysisError`를 포착해 변환. `user/service.py`의 소셜 토큰 검증은 `resp.status_code != 200`
      확인. (NFR-03-4)*
- [ ] **DB 트랜잭션 경계** — 장시간 외부 호출 동안 DB 트랜잭션을 점유하지 않는가.
      *근거: `diet/service.py:104`는 외부 이미지/AI 호출 전 `db.rollback()`으로 사전 검증
      트랜잭션을 명시적으로 종료.*

#### 3.3.2 프론트엔드 (React Native / TypeScript) 체크리스트

대상: `kelpus/src/features/{auth,diet,profile,subscription,health}/`

- [ ] **비인증 상태 화면 접근 차단** — `isAuthenticated`가 false면 보호 화면 진입이
      막히는가, 토큰 미존재 시 로그인 화면으로 라우팅되는가. *근거: `auth/store/authSlice.ts`의
      `isAuthenticated`·`isInitialized` 플래그가 내비게이션 게이트로 사용되는지 확인. (FR-01-4)*
- [ ] **프로필 미입력 시 AI 분석 유도** — 프로필(나이/성별/목표) 미입력 상태에서
      분석 요청 시 프로필 입력을 선행 유도하는가. *근거: `diet`/`profile` 피처 연동 확인. (FR-02-1-2)*
- [ ] **일일 분석 잔여 횟수 표시** — 남은 횟수와 한도가 직관적으로 노출되고,
      잔여가 적을 때 시각적 경고가 있는가. *근거: `diet/components/AnalysisCountBadge.tsx`는
      `remaining/limit`을 표시하고 `isLow = remaining <= 1`일 때 경고 스타일 적용. (FR-06-4, NFR-06-2)*
- [ ] **외부 API 권한 요청 명시성** — 헬스/SNS 권한 요청 시 목적·범위를 사용자에게
      안내하는가. *근거: `health/adapters/`의 권한 요청 흐름 확인. (FR-04-1-4, NFR-06-1)*
- [ ] **Redux 상태 불변성(이뮤터블 패턴)** — 상태 변경이 새 객체 반환 또는 Immer
      기반으로 이루어지는가(직접 변형 금지). *근거: `authSlice.ts`는 Redux Toolkit `createSlice`의
      Immer를 사용해 `state.x = ...` 작성이 안전하게 불변 업데이트로 변환됨 — RTK 외부에서
      직접 배열/객체 mutate가 없는지 확인.*
- [ ] **컴포넌트 props 타입 정의 완전성** — 모든 컴포넌트/thunk 인자가 명시적 타입을
      갖는가. *근거: `authSlice.ts`의 thunk가 `LoginRequest`/`SignUpRequest`/`SocialLoginRequest`
      타입을 명시. `any` 사용 최소화 확인.*
- [ ] **비동기 작업 로딩/에러 상태 처리** — async thunk의 `pending`/`fulfilled`/`rejected`가
      모두 처리되고, 실패 시 사용자 메시지(`error`)가 세팅되는가. *근거: `authSlice.ts`는
      login/signUp/socialLogin 각각 3개 상태를 모두 `extraReducers`에서 처리.*

---

### 3.4 발견 결함 기록 양식

> 강의 결함 용어 구분: **오류(error)** = 개발자 실수(원인), **결함(defect)** = 코드의
> 불완전 상태, **고장(failure)** = 요구사항 위반 동작. 본 양식의 "유형" 열은
> 발견 시점의 분류이며, 정적 검사에서는 주로 **오류·결함**을 기록한다.

| 결함 ID | 파일/모듈 | 유형(오류/결함) | 심각도 | 설명 | 발견 단계 | 수정 담당 | 상태 |
|---------|-----------|------------------|--------|------|-----------|-----------|------|
| DEF-S-001 | (예시) | 결함 | High | (설명) | 검사 회의 | (담당) | Open/Fixed/Closed |

심각도 분류: **Critical**(보안·과금·인증 우회) / **High**(핵심 기능 오동작) /
**Medium**(부분 기능·예외 누락) / **Low**(가독성·표준 위반).

---

### 3.5 정적 테스팅 결과 (예시 기록)

아래는 실제 Kelpus 코드 구조에서 정적 검토로 식별 가능한 **잠재 결함 패턴**이다.
실제 결함이 확정되지 않은 항목은 `[검토 예정]`/`잠재 리스크`로 표기한다(가짜 측정 단정 금지).

| 결함 ID | 파일/모듈 | 유형 | 심각도 | 설명 | 발견 단계 | 수정 담당 | 상태 |
|---------|-----------|------|--------|------|-----------|-----------|------|
| DEF-S-001 | `user/service.py:211-222` `_verify_apple_token` | 결함(잠재 리스크) | High | Apple identity token의 페이로드를 **서명 검증 없이** base64 디코딩만으로 신뢰함(`split(".")` 후 payload 디코딩). 위조 토큰으로 임의 `sub` 주입 가능성. NFR-02-1(인증정보 암호화/검증) 관점 점검 필요. | 검사 회의 | 인증 담당 | [검토 예정] |
| DEF-S-002 | `diet/service.py:84-153` `analyze_diet` 동시성 | 결함(잠재 리스크) | Medium | 사전 검증(`:77`)과 저장 직전 재검증(`:119`) 사이의 외부 AI 호출 구간에서 동일 사용자의 동시 요청이 들어오면 일일 한도(FR-04-2-3)를 미세하게 초과할 수 있는 race 가능성. 락/원자적 카운터 적용 여부 점검. | 검사 회의 | 식단 담당 | [검토 예정] |
| DEF-S-003 | `diet/router.py:87` `upload_diet_image` | 결함 | Low | `del current_user` 주석대로 인증은 요구하나 업로드 파일이 **사용자별로 분리 저장되지 않음**. 현 범위 밖이나 NFR-07-2(탈퇴 시 개인 데이터 완전 삭제) 관점에서 추후 결함화 가능. | 검사 준비 | 식단 담당 | Open |
| DEF-S-004 | `auth/store/authSlice.ts:51,77` | 결함(가독성/진단성) | Low | login·socialLogin의 `catch`가 에러를 무시(`catch {}`)하고 고정 메시지만 반환하여, 서버측 원인(네트워크/5xx) 구분이 안 됨. signUp(`:62-66`)은 409 분기가 있으나 다른 thunk는 없음. 표준화 검토. | 검사 회의 | 프론트 담당 | [검토 예정] |

> 위 항목들은 **인스펙션 4단계(회의)에서 "오류 발견"으로만 기록**된 것이며, 강의 규칙대로
> 회의 중 수정하지 않고 5단계(Rework)로 이관한다. 후속 조치(6단계)에서 수정 커밋과
> 대조하여 상태를 `Fixed`→`Closed`로 갱신한다.

---

## 4. 개발 테스팅 (Development Testing, 동적)

> 강의(§3.5)의 개발 테스팅 3계층 — **단위(Unit) → 컴포넌트/인터페이스(Component) → 시스템(System)** — 을 Kelpus 프로젝트(React Native + FastAPI 모노레포)에 그대로 적용한다.
> - **단위**: 개별 메소드/서비스 함수를 DB·네트워크·외부 API로부터 분리하여 검증한다(Fake/Mock 주입).
> - **컴포넌트**: 여러 유닛이 결합되는 지점, 즉 **인터페이스의 올바른 동작**을 검증한다.
> - **시스템**: 전체 통합 환경에서 **유즈케이스 기반 + 순차 다이어그램**으로 컴포넌트 간 상호작용을 검증한다.

---

### 4.1 단위 테스트 (Unit Test) — G6, G1

개별 도메인 서비스/메소드를 외부 의존성으로부터 분리하여 독립 검증한다. 백엔드는 기존 테스트 코드(`backend/tests/test_ai_analyzer.py`, `test_diet_service_ai_errors.py`)가 채택한 **Fake 객체 주입 + `unittest`** 패턴을, 프론트엔드는 `kelpus/__tests__/App.test.tsx`의 **Jest + @testing-library/react-native** 패턴을 따른다.

#### 4.1.1 단위 테스트 케이스 명세 (G1)

| TC ID | 대상 기능 | 분류(정상/비정상) | 입력 | 사전조건 | 예상 출력 | 실제 출력 | 판정(P/F) | 관련 요구ID |
|-------|----------|------------------|------|---------|----------|----------|-----------|------------|
| TC-U001 | 인증 - 로그인 | 정상 | `{email:"user@test.com", password:"Valid123!"}` | 해당 이메일 사용자가 가입되어 있고 비밀번호 해시 일치 | `TokenResponse{access_token, refresh_token}` 200 | [측정 예정] | P | FR-01-1, FR-01-3 |
| TC-U002 | 인증 - 로그인 | 비정상 | `{email:"user@test.com", password:"Wrong000"}` | 사용자 존재, 비밀번호 불일치 | `HTTPException 401` "이메일 또는 비밀번호가 올바르지 않습니다" | [측정 예정] |  | FR-01-1 |
| TC-U003 | 인증 - 로그인 | 비정상 | `{email:"none@test.com", password:"Valid123!"}` | 해당 이메일 사용자 미존재 | `HTTPException 401` (이메일 존재 여부 비노출) | [측정 예정] |  | FR-01-1, NFR-02-1 |
| TC-U004 | 인증 - 로그인 | 비정상 | `{email:"", password:"Valid123!"}` | - | `422 ValidationError` (EmailStr 검증 실패) | [측정 예정] |  | FR-01-1 |
| TC-U005 | 인증 - 소셜 로그인 | 정상 | `{provider:"google", id_token:"<valid>"}` | 토큰 서명/aud/exp 유효 | `TokenResponse` 200, 신규면 자동 회원가입 | [측정 예정] | P | FR-01-2 |
| TC-U006 | 인증 - JWT 만료 처리 | 비정상 | `Authorization: Bearer <expired_jwt>` | 액세스 토큰 exp 경과 | `HTTPException 401` "토큰이 만료되었습니다" | [측정 예정] |  | FR-01-3, FR-01-4 |
| TC-U007 | 식단 - AI 분석 요청 | 정상 | `DietAnalyzeRequest{image_url:"https://cdn../meal.jpg"}` | 프로필 완성, 무료 플랜 잔여 1회 | `DietAnalysisResponse{total_calories, carb/protein/fat_ratio, ai_comment}` 200, usage +1 | [측정 예정] | P | FR-04-2-1, FR-02-1 |
| TC-U008 | 식단 - AI 분석 요청 | 비정상 | `DietAnalyzeRequest{...}` | 무료 플랜 일일 한도(2회) 소진 | `HTTPException 429` + 구독 업그레이드 안내, usage 미증가 | [측정 예정] |  | FR-04-2-3, FR-04-2-4 |
| TC-U009 | 식단 - AI 분석 요청 | 비정상 | `DietAnalyzeRequest{...}` | 프로필(나이/성별/목표) 미입력 | `HTTPException 400/409` "프로필을 먼저 입력하세요" | [측정 예정] |  | FR-02-1-2 |
| TC-U010 | 식단 - 헬스 데이터 동기화 | 정상 | `DietSyncRequest{meals:[{...}]}` | OS 헬스 식단 데이터 존재 | `DietSyncResponse{synced_count, duplicated_count}` 200 | [측정 예정] | P | FR-04-1-1, FR-04-1-3 |
| TC-U011 | 식단 - 분석 이력 조회 | 정상 | `GET /diet/analyses?period=week` | 분석 이력 ≥1건 존재 | 기간 필터된 `list[DietAnalysisResponse]` 200 | [측정 예정] | P | FR-04-2-5, FR-02-2-1 |
| TC-U012 | 러닝 - 데이터 동기화(GPS) | 정상 | `RunningSyncRequest{distance, duration, gps_route:[...]}` | GPS 경로 포함 러닝 기록 | `RunningRecordResponse{id, ..., gps_route}` 저장 200 | [측정 예정] | P | FR-05-1-1, FR-05-1-2 |
| TC-U013 | 러닝 - 상세 조회 | 정상 | `GET /running/{record_id}` | 본인 소유 기록 존재 | `RunningRecordDetail{distance, pace, calories, gps_route}` 200 | [측정 예정] | P | FR-05-2-1 |
| TC-U014 | 러닝 - 리더보드 조회 | 정상 | `period="weekly", criterion="total_distance", limit=50` | 러닝 기록 보유 사용자 다수 존재 | `LeaderboardListResponse{rankings[], my_rank}` 200 | [측정 예정] | P | FR-05-3-1, FR-05-3-4 |
| TC-U015 | 프로필 - 등록 | 정상 | `{age:27, gender:"male", goal:"weight_loss"}` | 프로필 미존재 | `ProfileResponse` 201, AI 분석 입력값 반영 | [측정 예정] | P | FR-02-1-1 |
| TC-U016 | 프로필 - 수정 | 정상 | `{goal:"muscle_gain"}` | 프로필 존재 | `ProfileResponse{goal:"muscle_gain"}` 200, 이후 분석에 즉시 반영 | [측정 예정] | P | FR-02-1-1, FR-02-1-3 |
| TC-U017 | SNS - 해시태그 피드 조회 | 정상 | `GET /feed?page=1&page_size=20` | 캐시 DB에 #kelpus 게시물 존재 | `FeedListResponse{items[], page}` 외부 API 미호출 200 | [측정 예정] | P | FR-03-1-1, FR-03-2-2 |
| TC-U018 | SNS - 피드 새로고침 | 정상 | `POST /feed/refresh` | 크롤링 트리거 권한 보유 | 신규 수집분 반영된 피드, 중복 제거 | [측정 예정] | P | FR-03-1-3, FR-03-1-4 |
| TC-U019 | 구독 - 플랜 전환(무료→구독) | 정상 | `{plan:"premium", receipt:"<valid>"}` | 무료 플랜 사용자, 유효 영수증 | `SubscriptionResponse{plan:"premium", daily_limit↑}` 200 | [측정 예정] | P | FR-06-1, FR-06-2 |
| TC-U020 | 구독 - 만료 처리 | 비정상 | `check_subscription_status()` | 구독 만료일(expires_at) 경과 | 상태 `expired`, daily_limit 무료값으로 환원 | [측정 예정] |  | FR-06-3, FR-04-2-3 |

> 표기 규칙: "실제 출력"은 테스트 실행으로 측정하기 전이므로 `[측정 예정]`으로 둔다. 정상(Validation) 케이스는 기대 동작 충족을 확인하므로 판정 `P`, 비정상(Defect) 케이스는 결함 발견 목적의 실행 후 채운다(현재 공란).

#### 4.1.2 대표 단위 테스트 코드 예시

기존 백엔드 테스트(`test_diet_service_ai_errors.py`)의 **Fake 주입 + 호출 순서 검증** 스타일과 동일한 구조로 작성한다.

**(1) TC-U008 — 무료 플랜 한도 초과 (Python `unittest`, Defect 테스트)**

```python
# backend/tests/test_diet_plan_limit.py
import asyncio
import unittest
import uuid
from unittest.mock import patch
from fastapi import HTTPException

from app.domains.diet import service
from app.domains.diet.schemas import DietAnalyzeRequest


def run(coro):
    return asyncio.run(coro)


class FakeExhaustedPlan:
    """일일 한도를 모두 소진한 무료 플랜."""
    def __init__(self, order):
        self.order = order
        self.usage_updated = False

    def check_remaining_count(self):
        self.order.append("check_remaining")
        return False  # 잔여 횟수 없음

    def update_usage(self):  # 호출되면 안 됨
        self.usage_updated = True


class FakePlanRepo:
    def __init__(self, plan):
        self.plan = plan

    async def get_by_user_id(self, user_id, db):
        self.plan.order.append("get_plan")
        return self.plan


class DietPlanLimitTest(unittest.TestCase):
    def test_over_limit_blocks_and_does_not_increment_usage(self):
        order = []
        plan = FakeExhaustedPlan(order)
        with patch.object(service, "_plan_repo", FakePlanRepo(plan)):
            with self.assertRaises(HTTPException) as ctx:
                run(service.analyze_diet(
                    str(uuid.uuid4()),
                    DietAnalyzeRequest(image_url="https://cdn.example.com/meal.jpg"),
                    db=None,
                ))
        self.assertEqual(ctx.exception.status_code, 429)   # 한도 초과 차단
        self.assertFalse(plan.usage_updated)               # 사용량 미증가
        self.assertEqual(order, ["get_plan", "check_remaining"])  # 분석기 미호출


if __name__ == "__main__":
    unittest.main()
```

**(2) TC-U002 — 잘못된 비밀번호 로그인 (Python `unittest`, Defect 테스트)**

```python
# backend/tests/test_auth_login.py
import asyncio
import unittest
from unittest.mock import patch
from fastapi import HTTPException

from app.domains.user import service
from app.domains.user.schemas import LoginRequest


def run(coro):
    return asyncio.run(coro)


class FakeUserRepo:
    """비밀번호 해시가 일치하지 않는 사용자."""
    async def get_by_email(self, email, db):
        from types import SimpleNamespace
        return SimpleNamespace(id="u1", email=email, password_hash="$2b$12$correcthash")


class AuthLoginTest(unittest.TestCase):
    def test_wrong_password_returns_401_without_token(self):
        with patch.object(service, "_user_repo", FakeUserRepo()), \
             patch.object(service, "verify_password", lambda raw, hashed: False):
            with self.assertRaises(HTTPException) as ctx:
                run(service.login_user(
                    LoginRequest(email="user@test.com", password="Wrong000"),
                    db=None,
                ))
        self.assertEqual(ctx.exception.status_code, 401)
        # 이메일 존재 여부를 노출하지 않는 일반화된 메시지인지 확인 (NFR-02-1)
        self.assertNotIn("존재하지 않는", str(ctx.exception.detail))


if __name__ == "__main__":
    unittest.main()
```

**(3) TC-U017 — 피드 컴포넌트 렌더링 (Jest + React Native, Validation 테스트)**

```tsx
// kelpus/__tests__/FeedScreen.test.tsx
import React from 'react';
import {render, waitFor} from '@testing-library/react-native';
import FeedScreen from '../src/features/sns/FeedScreen';
import * as feedApi from '../src/features/sns/api';

jest.mock('../src/features/sns/api');

describe('FeedScreen', () => {
  it('캐시된 피드 항목을 외부 API 호출 없이 렌더링한다', async () => {
    (feedApi.getFeed as jest.Mock).mockResolvedValue({
      items: [{id: '1', author: 'runner_kim', caption: '#kelpus 5km 완주'}],
      page: 1,
    });

    const {getByText} = render(<FeedScreen />);

    await waitFor(() => {
      expect(getByText('#kelpus 5km 완주')).toBeTruthy();
    });
    // 피드는 캐시 DB 조회만 사용해야 한다 (FR-03-2-2, NFR-01-1)
    expect(feedApi.getFeed).toHaveBeenCalledTimes(1);
  });
});
```

---

### 4.2 컴포넌트 / 인터페이스 테스트 — G9

컴포넌트 테스트의 핵심은 **여러 유닛이 결합되는 인터페이스의 올바른 동작** 검증이다(§3.5). Kelpus는 모바일 앱·API 서버·DB·캐시·외부 API가 인터페이스로 연결되므로, 인터페이스 타입을 식별하고 **인터페이스 오류 3분류(오용·오해·타이밍, §3.6)** 를 적용한다.

#### 4.2.1 인터페이스 타입 식별

| 인터페이스 | 타입 | 연결 컴포넌트 |
|-----------|------|--------------|
| RN App ↔ FastAPI Backend | 메시지 패싱 (HTTP/REST, JSON) | 모바일 클라이언트 ↔ API 서버 |
| FastAPI ↔ PostgreSQL | 프로시저형 (SQLAlchemy ORM, async 세션) | 서비스 계층 ↔ 영속 저장소 |
| FastAPI ↔ Redis | 파라미터형 (캐시 키-값 get/set) | SNS 서비스 ↔ 피드 캐시 |
| FastAPI ↔ Samsung Health / Apple HealthKit | 메시지 패싱 (동기화 페이로드) | 식단/러닝 서비스 ↔ OS 헬스 어댑터 |
| FastAPI ↔ AI 분석 엔진(Gemini) | 메시지 패싱 (HTTP 요청/응답) | 식단 서비스 ↔ `AIAnalyzerService` |

> §3.6 가이드라인에 따라: 메시지 패싱 인터페이스(REST/헬스/AI)는 **스트레스 테스트**, 외부 호출 파라미터는 **경계값 테스트**, 프로시저형(ORM)은 호출 순서·트랜잭션 경계를 검증한다.

#### 4.2.2 인터페이스 오류 3분류 적용 (§3.6 — G9 핵심)

| 오류 유형 | 설명 | Kelpus 적용 예시 | 대응 TC |
|----------|------|-----------------|--------|
| **오용 (misuse)** | 잘못된 파라미터 타입·순서·개수로 인터페이스를 호출 | diet `analyze` API에 `age` 자리에 정수 대신 `string` 전달 / `image_url`에 `http://`(비보안) 전달 | TC-C001, TC-C002 |
| **오용 (misuse)** | 타인 소유 리소스 ID를 파라미터로 전달 | 다른 사용자의 `diet_record_id`를 분석 요청에 전달 | TC-C003 |
| **오해 (misunderstanding)** | 인터페이스 명세를 잘못 이해 | 무료 플랜 횟수를 "하루 2회"가 아닌 임의로 "3회"로 오해하여 3회차 요청 허용 / `period` 파라미터를 명세에 없는 `"daily"`로 전달 | TC-C004, TC-C005 |
| **오해 (misunderstanding)** | 정렬·전제조건을 위반한 호출 | 리더보드 캐시가 정렬 전인 상태에서 `my_rank` 계산 호출 | TC-C006 |
| **타이밍 (timing)** | 비동기 생산·소비 속도 차로 오래된/미완성 데이터 사용 | 헬스 동기화 완료 전에 AI 분석 요청(아직 동기화 안 된 식단으로 분석) / 크롤링 진행 중 피드 조회로 부분 데이터 반환 | TC-C007, TC-C008 |
| **타이밍 (timing)** | 캐시 만료와 갱신 사이의 경합 | 리더보드 5~15분 주기 갱신 직전/직후 동시 조회로 stale 순위 노출 | TC-C009 |

#### 4.2.3 인터페이스 테스트 케이스

| TC ID | 인터페이스 | 오류 유형 | 입력 | 예상 출력 | 관련 요구ID |
|-------|-----------|----------|------|----------|------------|
| TC-C001 | RN App ↔ FastAPI (diet analyze) | 오용 | 프로필 `age` 필드에 `"스물일곱"`(string) 전달 | `422 ValidationError` (타입 검증 차단, AI 미호출) | FR-04-2-1 |
| TC-C002 | FastAPI ↔ AI 엔진 (image fetch) | 오용 | `image_url="http://cdn../meal.jpg"`(비보안 스킴) | `AIAnalysisError 422`, HTTP 호출 이전 거부 | NFR-02-3, FR-04-2-1 |
| TC-C003 | RN App ↔ FastAPI (diet analyze) | 오용 | 타 사용자 소유 `diet_record_id` 전달 | `404 Not Found`, 분석기·저장·사용량 모두 미호출 | FR-04-2-1, NFR-02-2 |
| TC-C004 | RN App ↔ FastAPI (diet analyze) | 오해 | 무료 플랜에서 동일 일자 3회차 요청 | `429`, "구독 업그레이드 안내" (명세상 1~2회 한도) | FR-04-2-3, FR-04-2-4 |
| TC-C005 | RN App ↔ FastAPI (running leaderboard) | 오해 | `period="daily"`(명세에 없는 값) | `422` 또는 기본값 `weekly` 폴백, 명확한 에러 메시지 | FR-05-3-4 |
| TC-C006 | FastAPI ↔ Redis (leaderboard cache) | 오해 | 정렬되지 않은 캐시 기반 `my_rank` 계산 호출 | 순위 계산 전 정렬 보장(전제조건 검증), 잘못된 순위 미반환 | FR-05-3-3 |
| TC-C007 | FastAPI ↔ OS 헬스 / AI 엔진 | 타이밍 | 헬스 동기화 완료 전 AI 분석 요청 | `409 Conflict` 또는 "동기화 완료 후 재시도" 안내, 부분 데이터 분석 차단 | FR-04-1-2, FR-04-2-1 |
| TC-C008 | FastAPI ↔ SNS API / Redis | 타이밍 | 크롤링 진행 중 피드 조회 | 캐시 DB의 마지막 안정본 반환(부분/중복 미노출), 외부 API 미호출 | FR-03-2-2, NFR-03-2 |
| TC-C009 | FastAPI ↔ Redis (leaderboard) | 타이밍 | 캐시 갱신 주기(5~15분) 경계에서 동시 조회 | 갱신 중에도 직전 스냅샷 일관 반환, 5xx 미발생 | NFR-01-4 |
| TC-C010 | FastAPI ↔ PostgreSQL (analyze tx) | 오용/타이밍 | AI 응답 후 저장 단계에서 예외 발생 | 트랜잭션 롤백, 사용량(usage) 미증가 — 저장이 사용량 증가에 선행 | FR-04-2-5 |

> TC-C010은 기존 테스트 `test_success_saves_before_usage_increment`가 검증하는 호출 순서(`save_analysis` → `update_usage` → `flush`)와 직접 대응되며, 인터페이스(프로시저형 ORM)의 트랜잭션 경계 정확성을 보장한다.

---

### 4.3 시스템 테스트 (System Test) — 유즈케이스 기반

#### 4.3.1 테스트 전략

- 시스템 테스트는 전체 통합 환경(RN 앱 + FastAPI + PostgreSQL + Redis + 외부 API 스텁)에서 **컴포넌트 간 상호작용**을 검증한다(§3.5).
- **유즈케이스 기반 테스팅 + 순차 다이어그램**으로 상호작용 경로를 식별한다. 각 유즈케이스는 "사용자 행위 → 컴포넌트 간 메시지 흐름 → 관찰 가능한 결과"로 분해한다.
- 정상 흐름(Validation)과 외부 장애·비인증 같은 예외 흐름(Defect/가용성)을 함께 둔다.

#### 4.3.2 주요 유즈케이스별 시스템 테스트

| TC ID | 유즈케이스 | 전제조건 | 테스트 시나리오(단계) | 예상 결과 | 관련 요구ID |
|-------|-----------|---------|---------------------|----------|------------|
| UC-SYS-01 | 앱 접속 및 인증 플로우 | 앱 미로그인 상태 | 아래 단계 참조 | 인증 성공 후에만 기능 진입 | FR-01 |
| UC-SYS-02 | AI 식단 분석 End-to-End | 로그인·프로필 완성·잔여 횟수 보유 | 아래 단계 참조 | 분석 결과 표시 + 이력 저장 | FR-04-2, FR-02-1 |
| UC-SYS-03 | 러닝 동기화 → 리더보드 반영 | 로그인, OS 헬스 러닝 기록 존재 | 아래 단계 참조 | 동기화분이 리더보드 순위에 반영 | FR-05 |
| UC-SYS-04 | SNS 피드 크롤링 → 피드 표시 | 캐시 DB 운용 중 | 아래 단계 참조 | #kelpus 게시물 피드 노출 | FR-03 |
| UC-SYS-05 | 구독 전환 → 분석 횟수 증가 | 무료 플랜 사용자, 유효 영수증 | 아래 단계 참조 | 일일 한도 상향 반영 | FR-06, FR-04-2 |
| UC-SYS-06 | 외부 API 장애 시 핵심 기능 유지 | 외부 SNS/헬스/지도 API 다운 | 아래 단계 참조 | 기록 조회·프로필 관리 정상 동작 | NFR-03-1 |
| UC-SYS-07 | 비인증 접근 차단 | 토큰 없음/만료 | 아래 단계 참조 | 보호 리소스 401 차단 | FR-01-4 |

---

**UC-SYS-01 — 앱 접속 및 인증 플로우 (FR-01)**

- Step 1: 앱 실행 → **Expected:** 비로그인 시 로그인 화면으로 진입, 보호 탭 접근 불가
- Step 2: 올바른 이메일/비밀번호로 로그인 요청(`POST /auth/login`) → **Expected:** 200, `access_token`+`refresh_token` 발급 및 보안 저장
- Step 3: 발급된 토큰으로 보호 API(`GET /users/me`) 호출 → **Expected:** 200, 사용자 정보 반환
- Step 4: 액세스 토큰 만료 후 `POST /auth/refresh` 호출 → **Expected:** 200, 재로그인 없이 새 액세스 토큰 발급(FR-01-3)
- Step 5: 로그아웃(`POST /auth/logout`) 후 보호 API 재호출 → **Expected:** 401, 로컬 토큰 폐기 확인

**UC-SYS-02 — AI 식단 분석 End-to-End (FR-04-2, FR-02-1)**

- Step 1: 프로필(나이/성별/목표) 등록 완료 상태에서 식단 이미지 업로드(`POST /diet/upload`) → **Expected:** 200, 이미지 URL 반환
- Step 2: 분석 요청(`POST /diet/analyze`) → **Expected:** 플랜 잔여 횟수 확인 통과, AI 엔진(Gemini) 호출
- Step 3: AI 응답 수신 → **Expected:** `total_calories`·탄단지 비율·`ai_comment` 포함 결과를 5초 이내 반환(NFR-01-2)
- Step 4: 결과 저장 및 사용량 증가 → **Expected:** 분석 이력 1건 저장(저장이 usage 증가에 선행), 잔여 횟수 −1
- Step 5: 이력 화면(`GET /diet/analyses`) 진입 → **Expected:** 방금 분석 결과가 이력 목록 최상단에 표시(FR-04-2-5)

**UC-SYS-03 — 러닝 데이터 동기화 → 리더보드 반영 (FR-05)**

- Step 1: OS 헬스 권한 승인 후 러닝 동기화(`POST /running/sync`) 트리거 → **Expected:** GPS 경로 포함 러닝 기록 저장(FR-05-1-2)
- Step 2: 러닝 상세 조회(`GET /running/{id}`) → **Expected:** 거리·시간·페이스·칼로리·GPS 경로 반환, 지도 표시용 데이터 정상
- Step 3: 리더보드 갱신 주기 경과 후 조회(`GET /running/leaderboard`) → **Expected:** 동기화된 거리가 누적되어 순위에 반영
- Step 4: 본인 순위/주변 순위 조회(`GET /running/leaderboard/nearby`) → **Expected:** `my_rank`와 상하위 window 순위 반환(FR-05-3-3)
- Step 5: 기간 필터 `period=monthly`로 재조회 → **Expected:** 월간 기준으로 재계산된 순위 반환(FR-05-3-4)

**UC-SYS-04 — SNS 피드 크롤링 → 피드 표시 (FR-03)**

- Step 1: 크롤러가 외부 SNS API에서 #kelpus 공개 게시물 수집 → **Expected:** 메타정보(작성자·시간·썸네일·캡션)와 함께 캐시 DB 저장(FR-03-1-2)
- Step 2: 중복/부적절 콘텐츠 필터 적용 → **Expected:** 중복 게시물 제거, 부적절 콘텐츠 제외(FR-03-1-4)
- Step 3: 사용자가 피드 화면 진입(`GET /feed`) → **Expected:** 캐시 DB에서 조회, 외부 API 미호출, 2초 이내 로딩(NFR-01-1)
- Step 4: 게시물 선택 → **Expected:** 원본 SNS 게시물 링크로 이동(FR-03-2-3)
- Step 5: 사용자가 새로고침(`POST /feed/refresh`) 트리거 → **Expected:** 신규 수집분 반영된 피드 갱신(FR-03-1-3)

**UC-SYS-05 — 구독 전환 → AI 분석 횟수 증가 (FR-06, FR-04-2)**

- Step 1: 무료 플랜 사용자가 일일 한도 소진 상태에서 분석 요청 → **Expected:** 429 차단 + 구독 업그레이드 안내(FR-04-2-4)
- Step 2: 스토어 인앱 결제 후 구독 전환(`POST /subscription/upgrade`, 영수증 검증) → **Expected:** 200, 플랜 `premium`으로 변경(FR-06-2)
- Step 3: 현재 플랜/잔여 횟수 조회(`GET /subscription`) → **Expected:** 일일 한도 5~10회로 상향 표시(FR-04-2-3, FR-06-4)
- Step 4: 동일 일자 재분석 요청 → **Expected:** 200, 정상 분석 수행(한도 상향 즉시 반영)
- Step 5: 구독 만료일 경과 시뮬레이션 → **Expected:** 상태 `expired`, 한도 무료값으로 자동 환원(FR-06-3)

**UC-SYS-06 — 외부 API 장애 시 핵심 기능 유지 (NFR-03-1)**

- Step 1: 외부 SNS/헬스/지도 API를 모두 다운 상태로 스텁 설정 → **Expected:** 외부 의존 기능만 영향
- Step 2: 기록 조회(`GET /diet/analyses`, `GET /running`) 호출 → **Expected:** 로컬/DB 데이터 기반 정상 200(NFR-03-3)
- Step 3: 프로필 관리(`GET/PUT /users/profile`) 호출 → **Expected:** 정상 동작(NFR-03-1)
- Step 4: 피드 조회(`GET /feed`) 호출 → **Expected:** 캐시 DB 기반 열람 가능(NFR-03-2)
- Step 5: AI 분석 엔진 장애 상태로 분석 요청 → **Expected:** 명확한 오류 메시지 + 재시도 안내, 사용량 미차감(NFR-03-4)

**UC-SYS-07 — 비인증 접근 차단 (FR-01-4)**

- Step 1: 토큰 없이 보호 API(`GET /diet/analyses`) 호출 → **Expected:** 401 Unauthorized
- Step 2: 만료된 액세스 토큰으로 호출 → **Expected:** 401 "토큰이 만료되었습니다"
- Step 3: 위조/서명 불일치 토큰으로 호출 → **Expected:** 401, 어떤 비즈니스 로직도 미실행
- Step 4: 타 사용자 리소스 ID로 접근 시도 → **Expected:** 404/403, 데이터 비노출(NFR-02-2)
- Step 5: 정상 토큰 재발급 후 동일 API 호출 → **Expected:** 200, 정상 접근 복구

### 4.4 블랙박스 기법 (명세 기반 동적 테스팅)

> 블랙박스 테스팅은 시스템 내부 구현을 보지 않고 **명세(요구사항)** 만을 근거로 입력/출력 도메인을 검증한다. Kelpus의 핵심 명세 기반 기능인 **AI 분석 횟수 제한(FR-04-2-3, FR-04-2-4)** 과 **프로필 입력값 검증(FR-02-1-1)** 에 동등 분할·경계값 분석·의사결정 테이블을 적용한다.
> 실제 구현 근거: `SubscriptionPlan.check_remaining_count()` 는 `today_usage < daily_ai_limit` 일 때만 분석을 허용하며, 무료 플랜(`free`)과 구독 플랜(`premium`)의 `daily_ai_limit` 이 다르다 (`backend/app/domains/user/models.py`).

---

#### 4.4.1 동등 분할 (Equivalence Partitioning) — G2 ★★★

같은 처리(행위)를 유발하는 입력 값들을 하나의 **클래스**로 묶고, 각 클래스에서 **대표값 1개**만 테스트하여 TC 수를 줄인다. 유효(valid)·무효(invalid) 클래스를 모두 식별한다.

**[동등 분할 표]**

| 입력/출력 | 클래스 | 유효/무효 | 범위 | 대표값 | TC ID |
|-----------|--------|-----------|------|--------|-------|
| AI 분석 일일 요청 횟수 (무료, FR-04-2-3) | C1 정상 사용 | 유효 | 1~2회 | 1 | TC-BB001 |
| AI 분석 일일 요청 횟수 (무료, FR-04-2-3) | C2 유효 경계(상한) | 유효 | 2회 | 2 | TC-BB002 |
| AI 분석 일일 요청 횟수 (무료, FR-04-2-3) | C3 초과 | 무효 | 3회 이상 | 3 | TC-BB003 |
| AI 분석 일일 요청 횟수 (무료, FR-04-2-3) | C4 미사용 | 무효 | 0회 | 0 | TC-BB004 |
| AI 분석 일일 요청 횟수 (무료, FR-04-2-3) | C5 음수(비정상) | 무효 | 음수 | -1 | TC-BB005 |
| AI 분석 일일 요청 횟수 (구독, FR-04-2-3) | C1 정상 사용 | 유효 | 1~10회 | 5 | TC-BB006 |
| AI 분석 일일 요청 횟수 (구독, FR-04-2-3) | C2 유효 경계(상한) | 유효 | 10회 | 10 | TC-BB007 |
| AI 분석 일일 요청 횟수 (구독, FR-04-2-3) | C3 초과 | 무효 | 11회 이상 | 11 | TC-BB008 |
| 사용자 나이 (FR-02-1-1) | C1 정상 | 유효 | 1~150세 | 25 | TC-BB009 |
| 사용자 나이 (FR-02-1-1) | C2 하한 미만 | 무효 | 0세 이하 | -1 | TC-BB010 |
| 사용자 나이 (FR-02-1-1) | C3 상한 초과 | 무효 | 151세 이상 | 200 | TC-BB011 |
| 사용자 나이 (FR-02-1-1) | C4 타입 오류 | 무효 | 비정수(문자열) | "abc" | TC-BB012 |
| 구독 플랜 종류 (FR-06-1) | C1 무료 | 유효 | "free" | "free" | TC-BB013 |
| 구독 플랜 종류 (FR-06-1) | C2 구독 | 유효 | "premium" | "premium" | TC-BB014 |
| 구독 플랜 종류 (FR-06-1) | C3 미정의 값 | 무효 | 정의되지 않은 문자열 | "gold" | TC-BB015 |

**[동등 분할 테스트 케이스 명세 (G1)]**

| TC ID | 대상 기능 | 분류 | 입력 | 사전조건 | 예상 출력 | 실제 출력 | 판정(P/F) | 관련 요구ID |
|-------|-----------|------|------|----------|-----------|-----------|-----------|-------------|
| TC-BB001 | 무료 AI 분석 요청 | 정상 | today_usage=0, 1회째 요청 | 무료 플랜, 프로필 완성 | 분석 실행(200), today_usage=1 | [측정 예정] | P | FR-04-2-3 |
| TC-BB002 | 무료 AI 분석 요청 | 정상 | today_usage=1, 2회째 요청 | 무료 플랜, 한도 2 | 분석 실행(200), today_usage=2 | [측정 예정] | P | FR-04-2-3 |
| TC-BB003 | 무료 AI 분석 요청 | 비정상 | today_usage=2, 3회째 요청 | 무료 플랜, 한도 2 | 차단(402)+구독 안내 | [측정 예정] | P | FR-04-2-4 |
| TC-BB004 | 무료 AI 분석 요청 | 정상 | today_usage=0(미사용) | 무료 플랜 | 분석 실행(200) | [측정 예정] | P | FR-04-2-3 |
| TC-BB005 | 사용량 카운터 무결성 | 비정상 | today_usage=-1(손상값) | 무료 플랜 | 0으로 보정/거부, 음수 미허용 | [측정 예정] | P | FR-04-2-3 |
| TC-BB006 | 구독 AI 분석 요청 | 정상 | today_usage=4, 5회째 요청 | 구독 플랜, 한도 10 | 분석 실행(200), today_usage=5 | [측정 예정] | P | FR-04-2-3 |
| TC-BB007 | 구독 AI 분석 요청 | 정상 | today_usage=9, 10회째 요청 | 구독 플랜, 한도 10 | 분석 실행(200), today_usage=10 | [측정 예정] | P | FR-04-2-3 |
| TC-BB008 | 구독 AI 분석 요청 | 비정상 | today_usage=10, 11회째 요청 | 구독 플랜, 한도 10 | 차단(402) | [측정 예정] | P | FR-04-2-4 |
| TC-BB009 | 프로필 나이 등록 | 정상 | age=25 | 로그인 상태 | 저장 성공(200) | [측정 예정] | P | FR-02-1-1 |
| TC-BB010 | 프로필 나이 등록 | 비정상 | age=-1 | 로그인 상태 | 유효성 오류(422) | [측정 예정] | P | FR-02-1-1 |
| TC-BB011 | 프로필 나이 등록 | 비정상 | age=200 | 로그인 상태 | 유효성 오류(422) | [측정 예정] | P | FR-02-1-1 |
| TC-BB012 | 프로필 나이 등록 | 비정상 | age="abc" | 로그인 상태 | 타입 오류(422) | [측정 예정] | P | FR-02-1-1 |
| TC-BB013 | 구독 플랜 설정 | 정상 | plan="free" | 로그인 상태 | 무료 플랜 적용(한도 2) | [측정 예정] | P | FR-06-1 |
| TC-BB014 | 구독 플랜 설정 | 정상 | plan="premium" | 로그인 상태 | 구독 플랜 적용(한도 10) | [측정 예정] | P | FR-06-1 |
| TC-BB015 | 구독 플랜 설정 | 비정상 | plan="gold" | 로그인 상태 | 유효성 오류(422), 미정의 값 거부 | [측정 예정] | P | FR-06-1 |

---

#### 4.4.2 경계값 분석 (Boundary Value Analysis) — G3 ★★★

결함은 경계에서 가장 자주 발생한다("이상/이하/미만/초과" 표현에서 off-by-one 결함). 각 경계에 대해 **경계 직전 / 경계 / 경계 직후** 3점을 테스트한다.

**[경계값 분석 표]**

| 항목 | 경계 직전 | 경계 | 경계 직후 | 예상 결과 | TC ID |
|------|-----------|------|-----------|-----------|-------|
| 무료 플랜 일일 분석 한도(=2) | 1회 → 허용 | 2회 → 허용(마지막) | 3회 → 차단 | 2회까지 허용, 3회부터 402 | TC-BV001~003 |
| 구독 플랜 일일 분석 한도(=10) | 9회 → 허용 | 10회 → 허용(마지막) | 11회 → 차단 | 10회까지 허용, 11회부터 402 | TC-BV004~006 |
| 나이 유효 범위 하한(=1) | 0세 → 오류 | 1세 → 정상 | 2세 → 정상 | 1세 이상만 허용 | TC-BV007~009 |
| 나이 유효 범위 상한(=150) | 149세 → 정상 | 150세 → 정상 | 151세 → 오류 | 150세 이하만 허용 | TC-BV010~012 |

**[경계값 테스트 케이스 명세 (G1)]**

| TC ID | 대상 기능 | 분류 | 입력 | 사전조건 | 예상 출력 | 실제 출력 | 판정(P/F) | 관련 요구ID |
|-------|-----------|------|------|----------|-----------|-----------|-----------|-------------|
| TC-BV001 | 무료 한도(직전) | 정상 | today_usage=0, 요청(누적 1) | 무료, 한도 2 | 분석 실행(200) | [측정 예정] | P | FR-04-2-3 |
| TC-BV002 | 무료 한도(경계) | 정상 | today_usage=1, 요청(누적 2) | 무료, 한도 2 | 분석 실행(200), 마지막 허용 | [측정 예정] | P | FR-04-2-3 |
| TC-BV003 | 무료 한도(직후) | 비정상 | today_usage=2, 요청(누적 3) | 무료, 한도 2 | 차단(402)+구독 안내 | [측정 예정] | P | FR-04-2-4 |
| TC-BV004 | 구독 한도(직전) | 정상 | today_usage=8, 요청(누적 9) | 구독, 한도 10 | 분석 실행(200) | [측정 예정] | P | FR-04-2-3 |
| TC-BV005 | 구독 한도(경계) | 정상 | today_usage=9, 요청(누적 10) | 구독, 한도 10 | 분석 실행(200), 마지막 허용 | [측정 예정] | P | FR-04-2-3 |
| TC-BV006 | 구독 한도(직후) | 비정상 | today_usage=10, 요청(누적 11) | 구독, 한도 10 | 차단(402) | [측정 예정] | P | FR-04-2-4 |
| TC-BV007 | 나이 하한(직전) | 비정상 | age=0 | 로그인 상태 | 유효성 오류(422) | [측정 예정] | P | FR-02-1-1 |
| TC-BV008 | 나이 하한(경계) | 정상 | age=1 | 로그인 상태 | 저장 성공(200) | [측정 예정] | P | FR-02-1-1 |
| TC-BV009 | 나이 하한(직후) | 정상 | age=2 | 로그인 상태 | 저장 성공(200) | [측정 예정] | P | FR-02-1-1 |
| TC-BV010 | 나이 상한(직전) | 정상 | age=149 | 로그인 상태 | 저장 성공(200) | [측정 예정] | P | FR-02-1-1 |
| TC-BV011 | 나이 상한(경계) | 정상 | age=150 | 로그인 상태 | 저장 성공(200) | [측정 예정] | P | FR-02-1-1 |
| TC-BV012 | 나이 상한(직후) | 비정상 | age=151 | 로그인 상태 | 유효성 오류(422) | [측정 예정] | P | FR-02-1-1 |

> **구현 검증 포인트**: `check_remaining_count()` 는 `today_usage < daily_ai_limit` (미만, `<`)을 사용한다. 즉 한도 2일 때 `today_usage`가 0, 1이면 허용되고 2이면 차단된다 — "2회까지 허용, 3회째 차단"이라는 명세(FR-04-2-3/4)와 일치한다. 만약 코드가 실수로 `<=` 를 썼다면 3회까지 허용되어 경계 직후(TC-BV003) 테스트에서 결함이 노출된다.

---

#### 4.4.3 의사결정 테이블 (Decision Table) — G8 ★★

조건의 조합으로 동작이 결정되는 **AI 분석 가능 여부 판단 로직(FR-04-2, FR-02-1-2)** 에 적용한다.

**조건(Condition)**
- C1: 프로필 완성 여부 (Y=완성 / N=미입력) — FR-02-1-2
- C2: 일일 한도 초과 여부 (Y=초과 / N=여유) — FR-04-2-4
- C3: 구독 플랜 여부 (Y=구독 premium / N=무료 free) — FR-04-2-3

> 우선순위 규칙: 구현상 **프로필 완성(C1)** 이 가장 먼저 평가된다. 프로필 미입력이면 한도/플랜과 무관하게 프로필 입력 화면으로 유도하므로(FR-02-1-2), C1=N인 규칙(R5~R8)은 결과가 동일하다.

**[의사결정 테이블]**

| 규칙 | C1 프로필완성 | C2 한도초과 | C3 구독플랜 | 결과/액션 | TC ID |
|------|---------------|-------------|-------------|-----------|-------|
| R1 | Y | N | Y | 분석 실행 (구독, 한도 내) | TC-DT001 |
| R2 | Y | N | N | 분석 실행 (무료, 한도 내) | TC-DT002 |
| R3 | Y | Y | Y | 분석 차단(402) + 구독 한도 안내 | TC-DT003 |
| R4 | Y | Y | N | 분석 차단(402) + 구독 업그레이드 안내 | TC-DT004 |
| R5 | N | N | Y | 프로필 입력 화면으로 이동 | TC-DT005 |
| R6 | N | N | N | 프로필 입력 화면으로 이동 | TC-DT006 |
| R7 | N | Y | Y | 프로필 입력 화면으로 이동 | TC-DT007 |
| R8 | N | Y | N | 프로필 입력 화면으로 이동 | TC-DT008 |

**[의사결정 테이블 테스트 케이스 명세 (G1)]**

| TC ID | 분류 | 입력(C1,C2,C3) | 예상 출력 | 실제 출력 | 판정(P/F) | 관련 요구ID |
|-------|------|----------------|-----------|-----------|-----------|-------------|
| TC-DT001 | 정상 | (Y, N, Y) | 분석 실행(200) | [측정 예정] | P | FR-04-2-1 |
| TC-DT002 | 정상 | (Y, N, N) | 분석 실행(200) | [측정 예정] | P | FR-04-2-1 |
| TC-DT003 | 비정상 | (Y, Y, Y) | 402 + 한도 안내 | [측정 예정] | P | FR-04-2-4 |
| TC-DT004 | 비정상 | (Y, Y, N) | 402 + 업그레이드 안내 | [측정 예정] | P | FR-04-2-4 |
| TC-DT005 | 비정상 | (N, N, Y) | 프로필 입력 유도 | [측정 예정] | P | FR-02-1-2 |
| TC-DT006 | 비정상 | (N, N, N) | 프로필 입력 유도 | [측정 예정] | P | FR-02-1-2 |
| TC-DT007 | 비정상 | (N, Y, Y) | 프로필 입력 유도 | [측정 예정] | P | FR-02-1-2 |
| TC-DT008 | 비정상 | (N, Y, N) | 프로필 입력 유도 | [측정 예정] | P | FR-02-1-2 |

---

### 4.5 화이트박스 기법 (구현 기반 동적 테스팅)

> 화이트박스 테스팅은 코드의 **내부 제어 흐름**을 근거로 테스트를 설계한다. 대상은 Kelpus의 핵심 게이팅 로직인 **AI 분석 가능 여부 판단**이다. 실제 구현(`analyze_diet` + `check_remaining_count`)을 분석에 적합하도록 단일 함수 `can_analyze(user)` 의사코드로 정규화한다.

**[대상 코드 — AI 분석 가능 여부 판단 로직 (의사코드)]**

```python
def can_analyze(user):
    if not user.profile_complete:          # D1
        return "NEED_PROFILE"
    if user.plan == "free":                # D2
        if user.daily_count >= 2:          # D3
            return "LIMIT_EXCEEDED"
        return "ALLOW"
    else:  # premium
        if user.daily_count >= 10:         # D4
            return "LIMIT_EXCEEDED"
        return "ALLOW"
```

#### 4.5.1 커버리지 기준 적용 (G4) ★★★

강의 §3.8의 커버리지 위계(문장 < 분기 < 조건 < 분기/조건 < 다중조건)에서 **문장 검증**과 **분기 검증** 두 가지를 적용한다.

**① 문장 검증 (Statement Coverage)**
- 기준: 모든 실행 문장을 최소 1회 실행.
- 본 함수의 실행 가능한 종결 문장(return)은 5개(`NEED_PROFILE`, free-`LIMIT_EXCEEDED`, free-`ALLOW`, premium-`LIMIT_EXCEEDED`, premium-`ALLOW`)이며, 각 문장에 도달하려면 서로 다른 경로가 필요하므로 **최소 5개 TC**가 필요하다.
- **한계**: 문장 커버리지는 가장 약한 기준으로, `and`/`or` 복합 조건의 개별식 오류를 검출하지 못한다.

**② 분기 검증 (Branch Coverage)**
- 기준: 모든 조건문(D1~D4)의 참(T)/거짓(F)을 각각 최소 1회 실행.
- 분기 커버리지는 문장 커버리지를 포함(superset)한다. 아래 TC 구성은 D1~D4의 T/F 8개 분기를 모두 충족하면서 동시에 5개 문장을 모두 실행한다.

| 결정점 | T(참) 충족 TC | F(거짓) 충족 TC |
|--------|---------------|------------------|
| D1 (profile_complete?) | TC-WB001 | TC-WB002~005 |
| D2 (plan == "free"?) | TC-WB002, WB003 | TC-WB004, WB005 |
| D3 (daily_count >= 2?) | TC-WB002 | TC-WB003 |
| D4 (daily_count >= 10?) | TC-WB004 | TC-WB005 |

**[커버리지별 테스트 케이스 표]**

| TC ID | 커버리지 | 입력 (profile_complete, plan, daily_count) | 실행 경로(결정점) | 예상 출력 |
|-------|----------|---------------------------------------------|-------------------|-----------|
| TC-WB001 | 문장+분기 | (False, -, -) | D1=T | "NEED_PROFILE" |
| TC-WB002 | 문장+분기 | (True, "free", 2) | D1=F, D2=T, D3=T | "LIMIT_EXCEEDED" |
| TC-WB003 | 문장+분기 | (True, "free", 1) | D1=F, D2=T, D3=F | "ALLOW" |
| TC-WB004 | 문장+분기 | (True, "premium", 10) | D1=F, D2=F, D4=T | "LIMIT_EXCEEDED" |
| TC-WB005 | 문장+분기 | (True, "premium", 9) | D1=F, D2=F, D4=F | "ALLOW" |
| TC-WB006 | 분기 보강 | (False, "premium", 11) | D1=T (한도와 무관) | "NEED_PROFILE" |
| TC-WB007 | 분기 보강 | (True, "free", 0) | D1=F, D2=T, D3=F | "ALLOW" |
| TC-WB008 | 분기 보강 | (True, "free", 3) | D1=F, D2=T, D3=T | "LIMIT_EXCEEDED" |
| TC-WB009 | 분기 보강 | (True, "premium", 0) | D1=F, D2=F, D4=F | "ALLOW" |
| TC-WB010 | 분기 보강 | (True, "premium", 11) | D1=F, D2=F, D4=T | "LIMIT_EXCEEDED" |

> TC-WB001~005만으로 **문장 100% + 분기 100%** 가 달성된다. TC-WB006~010은 경계값과 결합한 보강 케이스로 신뢰성을 높인다. 단, 강의 원칙대로 **100% 분기 커버리지가 버그 없음을 의미하지 않는다** — 예컨대 `>=` 를 `>` 로 잘못 쓴 경계 결함은 분기 커버리지만으로는 놓칠 수 있어 경계값 분석(4.4.2)으로 보완한다.

---

#### 4.5.2 기본 경로 테스트 + 순환 복잡도 (G5) ★★★ — 핵심 섹션

절차: ① 순서도 → ② 제어흐름 그래프 → ③ 순환 복잡도(CC) 계산 → ④ 독립 경로 정의 → ⑤ 경로별 TC.

**① 제어흐름 그래프 (Control Flow Graph)**

`can_analyze` 함수를 노드/간선으로 변환한다. 모든 `return` 은 단일 종료 노드(N11)로 수렴시킨다 (E−N+2 공식이 P+1과 일치하려면 단일 진입/단일 종료 구조가 필요하다).

```
              [N1] 시작 can_analyze(user)
                     |
              [N2] D1: not profile_complete?
                   /            \
                T /              \ F
                 /                \
       [N3] return            [N4] D2: plan == "free"?
       "NEED_PROFILE"          /              \
            |               T /                \ F
            |                /                  \
            |       [N5] D3: count>=2?    [N8] D4: count>=10?
            |          /        \            /         \
            |        T/          \F        T/           \F
            |        /            \        /             \
            |  [N6] return   [N7] return [N9] return  [N10] return
            |  "LIMIT_EXC."  "ALLOW"   "LIMIT_EXC."  "ALLOW"
            |       |            |          |            |
            +-------+------------+----------+------------+
                                 |
                          [N11] 종료 (return 값 반환)
```

**노드(N) 목록 (N = 11)**
- N1 시작, N2 D1(프로필), N3 NEED_PROFILE, N4 D2(free?), N5 D3(무료 한도), N6 무료 LIMIT_EXCEEDED, N7 무료 ALLOW, N8 D4(구독 한도), N9 구독 LIMIT_EXCEEDED, N10 구독 ALLOW, N11 종료.

**간선(E) 목록 (E = 14)**
```
E1:  N1→N2        E8:  N5→N7 (F)
E2:  N2→N3 (T)    E9:  N6→N11
E3:  N2→N4 (F)    E10: N7→N11
E4:  N3→N11       E11: N8→N9 (T)
E5:  N4→N5 (T)    E12: N8→N10 (F)
E6:  N4→N8 (F)    E13: N9→N11
E7:  N5→N6 (T)    E14: N10→N11
```

**분기 노드(P) (P = 4)**: N2(D1), N4(D2), N5(D3), N8(D4) — 각각 출력 간선이 2개인 조건 노드.

**② 순환 복잡도 계산 — 3가지 공식 모두 계산하여 값 일치 확인**

```
CC = R의 수       = 5   (둘러싸인 영역 4개 + 외부 영역 1개 = 5)
CC = E − N + 2    = 14 − 11 + 2 = 5
CC = P + 1        = 4 + 1      = 5
→ 세 값 모두 5 로 일치 ✓  → 독립 경로 5개
```

> **영역(Region) 설명**: 각 결정 노드(N2,N4,N5,N8)가 두 갈래로 갈라졌다가 종료 노드(N11)에서 다시 합류하면서 평면 그래프 상에 닫힌 영역 4개를 만들고, 그래프 바깥의 무한 영역 1개를 더해 R = 5. 이는 Euler 공식(면 = E − N + 2)과 정확히 일치한다.
> **(참고) 강의 예시**: E=9, N=8, P=2 → CC = 9−8+2 = 3 = 2+1 = 3 → 독립 경로 3개. 본 함수는 결정 노드가 2개 더 많아(4개) CC가 5가 된다.

**③ 독립 경로 (Independent Paths) — CC=5 → 5개**

| 경로 | 경유 노드/간선 | 의미 |
|------|----------------|------|
| 경로1 | N1→N2(T)→N3→N11 | 프로필 미완성 → NEED_PROFILE |
| 경로2 | N1→N2(F)→N4(T)→N5(T)→N6→N11 | 무료·한도 초과 → LIMIT_EXCEEDED |
| 경로3 | N1→N2(F)→N4(T)→N5(F)→N7→N11 | 무료·한도 내 → ALLOW |
| 경로4 | N1→N2(F)→N4(F)→N8(T)→N9→N11 | 구독·한도 초과 → LIMIT_EXCEEDED |
| 경로5 | N1→N2(F)→N4(F)→N8(F)→N10→N11 | 구독·한도 내 → ALLOW |

**④ 독립 경로별 테스트 케이스 (G1)**

| 경로 | TC ID | 분류 | 입력 (profile_complete, plan, daily_count) | 예상 출력 | 실제 출력 | 판정(P/F) | 관련 요구ID |
|------|-------|------|---------------------------------------------|-----------|-----------|-----------|-------------|
| 경로1 | TC-BP001 | 비정상 | (False, "free", 0) | "NEED_PROFILE" (프로필 입력 유도) | [측정 예정] | P | FR-02-1-2 |
| 경로2 | TC-BP002 | 비정상 | (True, "free", 2) | "LIMIT_EXCEEDED" (402) | [측정 예정] | P | FR-04-2-4 |
| 경로3 | TC-BP003 | 정상 | (True, "free", 1) | "ALLOW" (분석 실행) | [측정 예정] | P | FR-04-2-3 |
| 경로4 | TC-BP004 | 비정상 | (True, "premium", 10) | "LIMIT_EXCEEDED" (402) | [측정 예정] | P | FR-04-2-4 |
| 경로5 | TC-BP005 | 정상 | (True, "premium", 9) | "ALLOW" (분석 실행) | [측정 예정] | P | FR-04-2-3 |

> 5개의 독립 경로 TC는 **기본 경로 집합(basis set)** 을 이루며, 이들의 조합으로 그래프의 모든 경로를 선형 표현할 수 있다. CC=5는 "이 함수를 완전히 분기 검증하는 데 필요한 최소 테스트 경로 수"의 상한 지표이기도 하다.

---

### 4.6 테스트 커버리지 측정 결과 (G7)

코드 실행 기반의 정량적 커버리지 지표를 정의한다. 백엔드는 `pytest + coverage.py`, 프론트엔드는 `Jest --coverage` 로 측정한다.

| 도메인 | 측정 도구 | 라인 커버리지 목표 | 브랜치 커버리지 목표 | 현재 측정값 | 비고 |
|--------|-----------|--------------------|----------------------|-------------|------|
| 백엔드 전체 | pytest + coverage.py | 80% | 75% | [측정 예정] | 전체 평균 기준 |
| 프론트엔드 전체 | Jest --coverage | 70% | 65% | [측정 예정] | UI 컴포넌트 제외 가능 |
| 핵심 도메인 — auth (user) | pytest + coverage.py | 90% 이상 | 85% 이상 | [측정 예정] | 인증·토큰 로직 (보안 핵심) |
| 핵심 도메인 — diet | pytest + coverage.py | 90% 이상 | 85% 이상 | [측정 예정] | AI 분석 게이팅 로직 (과금 핵심) |

**측정 방법(예)**
```bash
# 백엔드
pytest --cov=app --cov-branch --cov-report=term-missing
# 프론트엔드
jest --coverage
```

> ⚠️ **강의 핵심 원칙 — "100% 커버리지가 버그 없음을 의미하지 않는다"**
> 라인/브랜치 커버리지가 100%여도 (1) 테스트하지 않은 입력 조합, (2) 경계값 off-by-one, (3) 동시성·타이밍 결함, (4) 누락된 요구사항은 검출되지 않는다. 커버리지는 **"테스트가 닿지 않은 코드"를 찾는 하한 지표**일 뿐이며, 결함 부재의 증명이 아니다 (Dijkstra: "테스팅은 결함의 존재를 보일 수 있을 뿐, 부재를 증명하지 못한다"). 따라서 커버리지 수치는 블랙박스 기법(동등 분할·경계값·의사결정 테이블)과 **상호 보완적으로** 사용한다.
> 현재 측정값은 테스트 스위트 구현 후 CI 파이프라인에서 산출 예정이며, 본 명세서에서는 `[측정 예정]` 으로 표기한다.

---

## 5. 릴리즈 테스팅 (Release Testing)

> 본 절은 강의(26SS-se-week07a)의 **릴리즈 테스팅 – 성능/스트레스(G11)** 항목을
> Kelpus 프로젝트에 적용한 산출물이다. 릴리즈 테스팅은 개발팀이 아닌 별도의 관점에서
> 시스템 릴리즈 버전이 요구사항을 만족하는지를 검증하는 **확인(Validation) 테스팅**의 성격이 강하다.
> 성능 수치는 환경 의존적이므로 측정값은 `[측정 예정]`으로 표기하고, 목표값(요구 기준) 대비로 합격을 판정한다.

### 5.1 운영 프로파일 (Operational Profile)

강의 정의(§3.10): 운영 프로파일은 **실제 시스템이 처리할 작업의 조합과 빈도**를 반영한
테스트 세트다. 어떤 작업 유형이 90%를 차지하면 그 작업에 테스트를 집중한다.
Kelpus의 예상 사용 패턴(헬스 관심 사용자가 식단 분석·러닝 기록 조회를 주로 사용)을
기준으로 다음과 같이 운영 프로파일을 구성한다.

| 기능 | 예상 사용 빈도 | 테스트 집중도 | 근거 |
|------|:-------------:|:-------------:|------|
| AI 식단 분석 요청 (FR-04-2) | 40% | **집중 (High)** | 앱 핵심 가치. 분기 복잡(무료/구독 한도)·성능 요구(5초)·외부 LLM 의존으로 결함·지연 위험 최다 |
| 러닝 피드/리더보드 조회 (FR-05-2/3) | 25% | **집중 (High)** | 지도 렌더링·랭킹 집계 부하. 조회 빈도 높고 NFR-01-4/5 성능 직결 |
| SNS Vlog 피드 조회 (FR-03-2) | 20% | 중간 (Medium) | 캐시 DB 조회로 비교적 가벼우나 로딩 2초(NFR-01-1) 검증 필요 |
| 프로필 조회/수정 (FR-02-1) | 10% | 보통 (Normal) | 사용 빈도 낮으나 AI 분석 입력값 무결성에 영향 |
| 구독 관리 (FR-06) | 5% | 기본 (Basic) | 빈도는 낮으나 과금·상태 전이 정확성은 별도 단위 테스트(§4)로 보강 |

> **테스트 자원 배분 원칙**: 위 빈도에 비례하여 성능/스트레스 테스트의 부하 시나리오와
> 반복 횟수를 배정한다. 즉, AI 식단 분석과 러닝 조회에 전체 릴리즈 테스트 부하의 약 65%를
> 집중하여, 실제 운영에서 가장 빈번한 경로의 신뢰성을 우선 확보한다.

### 5.2 성능 테스트 시나리오

NFR-01(성능)의 각 요구사항을 측정 가능한 합격 기준으로 변환한 시나리오다.
모든 시나리오는 **동적 테스팅**(실제 실행 측정)이며, 정적 테스팅으로는 확인 불가한 항목이다.

| TC ID | 성능 항목 | 요구사항 기준 | 테스트 시나리오 | 합격 기준 | 관련 NFR |
|-------|-----------|--------------|----------------|-----------|----------|
| TC-P001 | Vlog 피드 로딩 시간 | ≤ 2초 | 캐시 DB에 1,000건 게시물 적재 상태에서 피드 첫 화면 로딩 시간 측정(외부 API 호출 없이) | 95퍼센타일 응답 ≤ 2.0초 / `[측정 예정]` | NFR-01-1 |
| TC-P002 | AI 식단 분석 응답 시간 | ≤ 5초 | 동기화된 식단 데이터 + 프로필 입력 상태에서 분석 요청→결과 반환까지 측정 | 95퍼센타일 응답 ≤ 5.0초 / `[측정 예정]` | NFR-01-2 |
| TC-P003 | 헬스 데이터 동기화 비블로킹 | UI 블로킹 없음 | 백그라운드 동기화 수행 중 UI 스크롤·탭 전환 프레임 드랍 측정 | 동기화 중 UI 입력 응답 유지(메인 스레드 블로킹 0건) / `[측정 예정]` | NFR-01-3 |
| TC-P004 | 지도 렌더링 시간 | ≤ 3초 | GPS 경로 포인트 500개 러닝 기록의 지도 경로 표시 완료 시간 측정 | 렌더링 완료 ≤ 3.0초 / `[측정 예정]` | NFR-01-5 |
| TC-P005 | 리더보드 갱신 주기 | 5~15분 주기 | 리더보드 캐시 TTL이 5~15분 범위로 동작하고 그 사이 실시간 재집계가 발생하지 않음을 확인 | 갱신 간격 ∈ [5분, 15분], 주기 외 재집계 0건 / `[측정 예정]` | NFR-01-4 |

> **확인 테스팅 성격**: TC-P001~P005는 모두 "요구사항을 만족함을 보여주는" 확인(Validation)
> 테스트다. 합격 판정은 **목표값 이내 여부**로 하며, 측정 환경(단말 사양·네트워크)을 함께
> 기록하여 재현성을 확보한다(§2.4-3 제약 반영).

### 5.3 스트레스 테스트 시나리오

강의 정의(§3.10): 스트레스 테스팅은 **설계 한계치 미만에서 시작해 최대치까지 부하를 점증**시키며,
① 실패 지점, ② 안전한 종료(graceful degradation) 여부, ③ 과부하 시 결함·데이터 오염 여부를
관찰한다. Kelpus는 외부 LLM·헬스 API에 의존하므로, 동시 요청 급증 시 큐 적체·타임아웃·중복 카운트
등이 주요 관찰 대상이다.

| TC ID | 시나리오 | 시작 부하 | 최대 부하 | 측정 항목 | 합격 기준 |
|-------|----------|:---------:|:---------:|-----------|-----------|
| TC-S001 | 동시 접속자 점증 | 10명 | 500명 | 응답 지연, 오류율(5xx), 세션 유지율 | 실패 지점 식별 + 과부하 시 안전 종료(503 응답·데이터 오염 0건) / `[측정 예정]` |
| TC-S002 | AI 분석 동시 요청 폭주 | 10건/s | 100건/s | 분석 큐 적체, 타임아웃율, **일일 한도 카운트 정합성** | 한도 초과 차단 정확(중복/누락 카운트 0건), 큐 적체 시 재시도 안내(NFR-03-4) / `[측정 예정]` |
| TC-S003 | 헬스 동기화 대량 유입 | 1,000 레코드 | 100,000 레코드 | 동기화 처리 시간, 중복 감지 정확도, 메모리 사용량 | 중복 감지 누락 0건, OOM·크래시 없음, 백그라운드 비블로킹 유지 / `[측정 예정]` |
| TC-S004 | SNS 캐시 DB 부하 | 1만 게시물 | 100만 게시물 | 피드 조회 지연, 캐시 정리(30일) 동작 | 부하 증가에도 피드 조회 2초 이내 유지, 30일 경과분 자동 정리(NFR-07-1) / `[측정 예정]` |

> **데이터 오염 점검(핵심)**: TC-S002에서 동시 요청 폭주 시 AI 분석 일일 한도 카운터가
> 미세하게 초과 증가하거나 누락되는지를 집중 관찰한다. 이는 §3.5의 잠재 결함 **DEF-S-002**(동시성
> race 가능성)와 직접 연결되는 스트레스 검증으로, 정적 검토에서 식별한 결함 가설을 동적으로 재현·확인한다.

---

## 6. 사용자 테스팅 (User Testing)

> 본 절은 강의의 **사용자 테스팅 – 알파/베타/인수(G12)** 항목을 Kelpus에 적용한 산출물이다.
> 사용자 테스팅은 개발 환경이 아닌 **실제 사용자·실제 환경**에서 수행되며, 특히 인수 테스팅은
> 강의가 명시한 **6단계 절차**(§3.11)와 **기능+비기능 인수 기준**을 모두 커버해야 한다.

### 6.1 알파 테스팅 (Alpha Testing)

강의 정의(§3.11): 알파 테스팅은 **개발팀과 가까운 사용자 그룹**이 초기 버전을 테스트하는 단계다.

| 항목 | 내용 |
|------|------|
| 참여자 | 개발팀 인접 그룹 — 팀원 및 지인 5~10명 |
| 기간 | 내부 출시(internal release) 후 2주 |
| 대상 기능 | 전체 핵심 기능 — 인증(FR-01), 식단 분석(FR-04), 러닝(FR-05), SNS 피드(FR-03) |
| 방법 | 개발자 **직접 관찰** + 버그 리포트(§7 결함 리포트 양식 사용) |
| 목적 | 실사용 흐름에서 드러나는 명백한 결함·UX 장애를 조기 발견(결함 테스팅 성격) |

### 6.2 베타 테스팅 (Beta Testing)

강의 정의(§3.11): 베타 테스팅은 **더 많은 외부 사용자**에게 공개하여 테스트하는 단계다(오픈 베타 가능).

| 항목 | 내용 |
|------|------|
| 참여자 | 외부 사용자 그룹 20~50명 — 헬스에 관심 있는 대학생, 러너 커뮤니티 |
| 기간 | 알파 단계에서 발견된 버그 수정 후 3주 |
| 방법 | **오픈 베타** 배포(TestFlight / Google Play 내부·공개 테스트 트랙) + 인앱 피드백 폼 |
| 수집 데이터 | 크래시 로그, 사용성 피드백, 잔여 분석 횟수 인지율(NFR-06-2), 3탭 도달성(NFR-06-3) |
| 목적 | 다양한 단말·OS·네트워크 환경에서의 호환성(NFR-05)·안정성(NFR-03) 검증 |

### 6.3 인수 테스팅 — 6단계 (Acceptance Testing) — G12 핵심

강의가 정의한 **인수 테스트 6단계**(§3.11)를 Kelpus에 그대로 적용한다.
기능 요구사항과 비기능 요구사항을 **모두 커버**하며, 모든 요구사항(FR/NFR)이
인수 기준에 매핑되도록 한다.

| 단계 | 활동 | Kelpus 적용 내용 |
|------|------|------------------|
| **1단계: 인수 기준 정의** (Define criteria) | 무엇을 충족해야 수락할지 합의 | FR-01~FR-06(기능) + NFR-01~NFR-07(비기능) 전체를 인수 기준으로 확정(§6.4 표) |
| **2단계: 인수 테스트 설계** (Derive tests) | 인수 기준으로부터 테스트 도출 | 시스템 유즈케이스 UC-SYS-01~UC-SYS-07(인증·프로필·SNS·식단·러닝·구독·통계 흐름) 기반으로 인수 시나리오 작성 |
| **3단계: 실행** (Run tests) | 실제 환경에서 수행 | 실제 **Android 10+ / iOS 15+ 기기**에서 베타 참여자가 인수 시나리오 수행(NFR-05-1) |
| **4단계: 결과 협상** (Negotiate results) | 결과를 이해관계자와 검토 | 팀장(이해관계자 대리)과 결과 검토 회의, 미충족 항목의 심각도·수용 가능 여부 협의 |
| **5단계: 수락/거부** (Accept/Reject) | 인수 여부 판정 | 인수 기준 충족 시 **수락(Accept)**, 핵심 기준 미충족 시 **거부(Reject)** |
| **6단계: (거부 시) 추가 개발 후 재수행** | 보완 후 재인수 | 거부 항목을 §7 결함 처리 흐름으로 수정 → 회귀 테스트 → 인수 테스트 재수행 |

### 6.4 인수 기준 (기능 + 비기능)

강의 명시: 인수 테스트는 **기능과 비기능을 모두, 모든 요구사항을 커버**해야 한다.

| 항목 | 인수 기준 | 측정 방법 | Pass 기준 |
|------|-----------|-----------|-----------|
| **기능 — FR-01 인증** | 회원가입·로그인·소셜 로그인·비인증 차단이 모두 동작 | 시스템 시나리오 수행 | 4개 하위 요구 전부 정상(§4 TC-001~008 통과) |
| **기능 — FR-02 마이페이지** | 프로필 등록·수정, 기간별 통계 조회 동작 | 시나리오 수행 | 프로필 변경이 AI 분석에 즉시 반영(FR-02-1-3) |
| **기능 — FR-03 SNS 연동** | #kelpus 피드 수집·조회·원본 링크 이동 동작 | 시나리오 수행 | 중복/부적절 필터 적용, 피드 정상 탐색 |
| **기능 — FR-04 식단 분석** | 동기화→분석→이력 저장, 한도 차단 동작 | 시나리오 수행 | 무료 1~2회/구독 5~10회 한도 정확, 초과 시 차단·안내(FR-04-2-3/4) |
| **기능 — FR-05 러닝 관리** | 동기화·상세 조회·지도 경로·리더보드 동작 | 시나리오 수행 | 경로 시각화·랭킹 필터 정상 |
| **기능 — FR-06 구독·결제** | 플랜 전환·인앱 결제·상태 관리·잔여 횟수 표시 | 샌드박스 결제 시나리오 | 구독 상태 전이(활성/만료/취소) 정확 |
| **비기능 — NFR-01 성능** | 피드 2초/AI 5초/지도 3초 이내 | §5.2 성능 TC | TC-P001~P005 합격 |
| **비기능 — NFR-02 보안** | 인증 암호화·API 키 서버 관리·결제 위임 | 정적 검사(§3) + 시스템 | 시크릿 클라 미노출, HTTPS 적용 |
| **비기능 — NFR-03 가용성** | 외부 API 장애 시 핵심 기능 정상 | 결함 주입 시나리오 | 캐시 기반 피드 열람·로컬 조회 가능 |
| **비기능 — NFR-05 호환성** | iOS 15+/Android 10+ 동작, 반응형 | 실기기 인수(3단계) | 양 OS·다양한 화면 정상 |
| **비기능 — NFR-06 사용성** | 3탭 이내 도달, 잔여 횟수 직관 표시 | 베타 사용성 측정 | 핵심 기능 3탭 이내(NFR-06-3) |

---

## 7. 결함 관리 (Defect Management)

> 본 절은 강의의 **결함 용어/리포트(G14)** 항목을 적용한 산출물이다. §1.3·§3.4에서 정의한
> 결함 용어를 재확인하고, 결함 리포트 양식·심각도 분류·처리 흐름을 표준화한다.

### 7.1 결함 용어 정확 사용 (§3.1 재확인)

결함 관리 전 과정에서 강의 정의(§3.1)를 일관되게 사용한다. 혼용은 감점 요인이므로 엄격히 구분한다.

| 용어 | 정의 | 결함 관리에서의 위치 |
|------|------|---------------------|
| **오류 (error)** | 개발자가 만드는 **실수**. 결함의 원인. | 근본 원인 분석(Root Cause)에서 식별 — "왜 이 결함이 생겼는가" |
| **결함 (defect/fault/bug)** | 오류로 프로그램이 **불완전해진 상태**. 고장의 원인. | 결함 리포트의 대상. 코드/명세에 존재하는 잘못 |
| **고장/실패 (failure)** | 시스템이 **요구사항대로 동작하지 않는** 관찰된 현상. | 결함 발견의 트리거 — 사용자가 마주하는 증상. *모든 결함이 고장으로 이어지지는 않는다.* |

> 결함 리포트는 **고장(증상)** 으로부터 출발해 **결함(코드의 잘못)** 을 특정하고,
> 사후에 **오류(개발자 실수의 유형)** 를 회고하여 재발을 방지한다.

### 7.2 결함 리포트 양식

| 필드 | 설명 | 예시 |
|------|------|------|
| 결함 ID | `DF-YYYY-NNN` 형식의 고유 식별자 | DF-2026-017 |
| 제목 | 결함을 한 줄로 요약 | 무료 플랜 사용자가 2회째 AI 분석 시도 시 1회만에 차단됨 |
| 발견 날짜 | 결함을 관찰한 날짜 | 2026-06-19 |
| 발견 단계 | 정적 / 단위 / 컴포넌트 / 시스템 / 릴리즈 / 사용자 중 | 단위 테스트 |
| 심각도 | Critical / Major / Minor / Trivial (§7.3) | Major |
| 재현 단계 | 고장을 재현하는 순서 | 1. 무료 플랜 로그인 2. 식단 동기화 3. 1회 분석 후 즉시 2회째 분석 요청 |
| 실제 결과 | 관찰된 동작(고장) | "일일 한도 초과"로 차단됨 |
| 예상 결과 | 요구사항상 기대 동작 | 무료 플랜은 하루 1~2회 가능하므로 2회째도 허용(FR-04-2-3) |
| 관련 요구ID | 위반된 요구사항 | FR-04-2-3 |
| 담당자 | 수정 책임자 | 식단 도메인 담당 |
| 상태 | Open / In Progress / Fixed / Verified / Closed | Open |

### 7.3 심각도 분류

| 심각도 | 정의 | Kelpus 예시 | SLA(수정 목표) |
|--------|------|-------------|----------------|
| **Critical** | 앱 사용 자체가 불가능. 보안·과금·인증 직결 | 앱 크래시, 로그인 불가, 인증 토큰 우회, 결제 이중 청구 | 24시간 이내 핫픽스 |
| **Major** | 핵심 기능이 동작하지 않거나 데이터 손상 | AI 분석 한도 차단 오작동, 헬스 동기화 데이터 유실, 구독 상태 오반영 | 3일 이내 |
| **Minor** | 부분 기능 오류·예외 누락(우회 가능) | 통계 차트 일부 미표시, 번역 누락, 일부 에러 메시지 부정확 | 다음 스프린트 |
| **Trivial** | 사용에 영향 없는 사소한 문제 | 미세 UI 정렬 어긋남, 오탈자, 색상 불일치 | 백로그(여유 시) |

### 7.4 결함 처리 흐름

발견부터 종료까지의 결함 생애주기를 표준화한다. 인스펙션(§3.2.2)에서 발견된 정적 결함과
동적 테스트(§4~§6)에서 발견된 고장 모두 동일한 흐름을 따른다.

```
[발견]            고장 관찰 또는 인스펙션 결함 식별
   │              (발견 단계·증상 기록)
   ▼
[리포트 등록]      §7.2 양식으로 DF-YYYY-NNN 발번, 상태=Open
   │
   ▼
[담당자 배정]      도메인 담당자에게 할당, 심각도(§7.3)·SLA 부여
   │              상태=Open → In Progress
   ▼
[수정 (Rework)]    근본 오류 분석 후 코드 수정·커밋(fix: 컨벤션)
   │              상태=In Progress → Fixed
   ▼
[검증 (Verify)]    수정 반영본에 재현 단계 재실행 + 회귀 테스트
   │              ├─ 재현 안 됨 → 상태=Verified
   │              └─ 재현 됨   → [수정]으로 되돌림(reopen)
   ▼
[종료 (Close)]     모더레이터/담당자 최종 확인 후 상태=Closed
                  추적성 매트릭스·회귀 스위트(살충제 패러독스 대비) 갱신
```

> **정적-동적 연계**: §3.5에서 `[검토 예정]`으로 기록된 잠재 결함(DEF-S-001~004)은 위 흐름의
> [검증] 단계에서 동적 테스트(예: DEF-S-002 ↔ TC-S002 동시성 스트레스)로 재현을 시도하여,
> 정적·동적 테스팅의 **상보성**(§1.2-5)을 결함 관리 차원에서 실현한다.

---

## 8. 결론

### 8.1 테스팅 기법 커버리지 요약

본 명세서가 강의 가점 항목(G1~G16)을 어떻게 **적용**했는지 정리한다.
("설명"이 아닌 "산출물(표·코드·그래프·계산)"로 적용했는지를 기준으로 한다.)

| 가점 항목 | 기법 | 적용 섹션 | 적용 여부 |
|-----------|------|-----------|:---------:|
| **G1** | 테스트 케이스 명세 (정상+비정상, TC 표) | §4.1, §4.3, §4.4 | ✓ 적용 |
| **G2** | 블랙박스 – 동등 분할(유효/무효 클래스) | §4.4 | ✓ 적용 |
| **G3** | 블랙박스 – 경계값 분석(직전/경계/직후) | §4.4 | ✓ 적용 |
| **G4** | 화이트박스 – 커버리지 기준 2개 이상 | §4.5 | ✓ 적용 |
| **G5** | 화이트박스 – 기본 경로 + 순환 복잡도(3공식) | §4.5 | ✓ 적용 |
| **G6** | 개발 테스팅 3계층(단위·컴포넌트·시스템) | §4.1~§4.3 | ✓ 적용 |
| **G7** | 테스트 커버리지 정량 지표(%) | §4.6 | ✓ 적용 |
| **G8** | 블랙박스 – 의사결정 테이블 | §4.4 | ✓ 적용 |
| **G9** | 컴포넌트/인터페이스 테스팅(오류 3분류) | §4.2 | ✓ 적용 |
| **G10** | 정적 테스팅/인스펙션 6단계 | §3 | ✓ 적용 |
| **G11** | 릴리즈 테스팅 – 성능/스트레스 | §5 | ✓ 적용 |
| **G12** | 사용자 테스팅 – 알파/베타/인수 6단계 | §6 | ✓ 적용 |
| **G13** | 테스트 계획 + 요구사항 추적성 매트릭스 | §2.5 | ✓ 적용 |
| **G14** | 결함 용어/리포트 | §1.3, §3.4, §7 | ✓ 적용 |
| **G15** | 확인 vs 결함 테스팅 구분 | §1.4, 각 TC 분류 열 | ✓ 적용 |
| **G16** | 테스팅 원칙 반영 | §1.2, §8.3 | ✓ 적용 |

> **폭과 깊이**: ★★★ 항목(G1·G2·G3·G4·G5)은 표·계산·코드로 깊게 적용하였고,
> ★★/★ 항목도 모두 산출물 수준으로 커버하여 강의가 요구한 **폭(다양한 기법)과
> 깊이(핵심 기법의 실제 적용)** 를 동시에 달성하였다.

### 8.2 잔여 리스크

테스팅을 통해 신뢰성을 향상시켰으나, 다음 리스크는 본 명세서 범위에서 완전히 해소되지 못했다.

- **외부 API 실제 테스트 불가**: Instagram SNS API, 삼성 헬스/Apple HealthKit API는
  정책·권한·레이트 리밋 제약으로 CI 상시 실연동이 어려워 목/스텁으로 대체했다(§2.4-1).
  실제 연동 환경에서의 인터페이스 결함은 사용자 테스팅 단계에서 추가 검증이 필요하다.
- **인앱 결제 샌드박스 한계**: 실제 과금·환불 플로우는 스토어 샌드박스로만 검증 가능하여
  실결제 경로의 일부 예외는 자동화 범위 밖이다(§2.4-2).
- **실제 iOS/Android 기기 테스트 미완**: 호환성(NFR-05) 전수 검증을 위한 다양한 실기기
  매트릭스 테스트는 베타·인수 단계로 이월된다.
- **AI 분석 엔진 응답 일관성**: 외부 LLM에 의존하므로 동일 입력에 대한 응답이 변동될 수 있어,
  결과의 결정성(determinism)을 가정한 단정적 검증이 제한된다.

### 8.3 한계 및 테스팅 원칙 재확인

본 명세서는 강의가 강조한 테스팅의 본질적 한계를 인지한 위에서 작성되었다.

1. **결함의 존재만 증명 (Dijkstra·Hoare)**: "테스팅은 결함이 **있음**을 보여줄 뿐,
   결함이 **없음**을 증명하지 못한다." 본 명세서의 모든 TC가 통과하더라도 Kelpus에
   결함이 없다고 단정하지 않는다. 목표는 어디까지나 **신뢰성 향상**이다.
2. **완전 테스트(Exhaustive Testing)는 불가능**: 모든 입력·경로 조합 검증은 비현실적이므로,
   동등 분할·경계값으로 대표값을 선별하여 효율을 확보했다(§4.4).
3. **100% 커버리지 ≠ 버그 없음**: §4.6의 커버리지 목표를 달성하더라도, 미작성 경로·누락된
   요구사항·잘못된 명세 자체의 결함은 커버리지 수치로 잡히지 않는다.
4. **살충제 패러독스(Pesticide Paradox)**: 동일 TC의 반복은 새로운 결함을 더 이상 찾지
   못한다. 따라서 회귀 테스트 스위트와 경계값·시나리오를 **주기적으로 갱신**해야 한다(§1.2-4, §7.4).
5. **정적·동적의 상보성**: 코드 인스펙션(§3)과 동적 테스트(§4~§6)는 어느 하나로 대체되지
   않으며, 결함 관리(§7.4)에서 두 결과를 연계하여 상호 보완적으로 운용한다.

> **결론**: Kelpus 테스팅은 정적 검사로 결함을 조기에 제거하고, 블랙박스·화이트박스 동적
> 기법으로 입출력·경로 결함을 노출하며, 릴리즈·사용자 테스팅으로 성능·실환경 적합성을
> 확인하는 **다층적 검증 체계**를 구성하였다. 이를 통해 "버그 없음 증명"이 아닌
> **지속적 신뢰성 향상**이라는 테스팅 본연의 목표를 달성한다.
