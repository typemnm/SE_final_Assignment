// "Dark Forest Dawn" — Stitch 디자인 시스템 기반
export const colors = {
  // ── 배경 ─────────────────────────────────────
  background: '#03170E',       // Deep forest (최하단 배경)
  surface: '#0D2318',          // 카드 배경
  surfaceBright: '#283E32',    // 강조 카드 / 입력 필드 배경
  surfaceHighlight: 'rgba(255,255,255,0.06)', // 반투명 오버레이 카드

  // ── 브랜드 ───────────────────────────────────
  primary: '#34D399',          // Emerald — 메인 액션, 버튼
  primaryLight: '#4ADE80',     // Light Mint — 그라디언트 끝, secondary
  primaryDark: '#059669',      // 눌림 상태, 비활성 강조

  // ── 보조 포인트 ──────────────────────────────
  accent: '#FCD34D',           // Golden Yellow — 칼로리, 달성 뱃지
  accentDark: '#F59E0B',
  error: '#F87171',            // Soft Red

  // ── 텍스트 ───────────────────────────────────
  text: {
    primary: '#F0FDF4',        // 거의 흰 그린 — 제목, 강조 수치
    secondary: '#A7C4B5',      // 안개 낀 숲 — 보조 텍스트
    disabled: '#4B6358',       // 비활성
    inverse: '#03170E',        // 밝은 배경 위 텍스트 (ex. 뱃지)
  },

  // ── 테두리 / 구분선 ───────────────────────────
  border: '#1E3328',
  divider: '#162B20',

  // ── 그라디언트 프리셋 ─────────────────────────
  gradient: {
    background: ['#03170E', '#0E1F18'] as const,           // 배경 위→아래
    card: ['#0D2318', '#132B1E'] as const,                  // 카드
    button: ['#34D399', '#4ADE80'] as const,                // 버튼 좌→우
    buttonVertical: ['#2DC78A', '#34D399'] as const,        // 버튼 위→아래
    accent: ['#FCD34D', '#F59E0B'] as const,                // Accent 버튼
  },
};
