export interface AppTheme {
  bg: string;
  bgGradient?: string[];
  bgGradientLocations?: number[];
  bgGradientStart?: {x: number; y: number};
  bgGradientEnd?: {x: number; y: number};

  card: string;
  cardBorderTop: string;
  cardBorderSide: string;

  textPri: string;
  textSec: string;
  textDis: string;
  textInverse: string;

  emerald: string;
  teal: string;
  gold: string;
  error: string;
  success: string;

  headerBg: string;
  headerBorder: string;
  track: string;
  divider: string;

  orb1: string;
  orb2: string;

  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
}

// ── Dark: "Dark Forest Dawn" ────────────────────────────────────────────────
export const darkTheme: AppTheme = {
  bg:             '#03170E',
  card:           'rgba(13, 32, 22, 0.72)',
  cardBorderTop:  'rgba(255, 255, 255, 0.09)',
  cardBorderSide: 'rgba(45, 74, 60, 0.18)',

  textPri:        '#D0E8D8',
  textSec:        '#BBCAC0',
  textDis:        '#4B6358',
  textInverse:    '#03170E',

  emerald:        '#34D399',
  teal:           '#18A479',
  gold:           '#FCD34D',
  error:          '#F87171',
  success:        '#34D399',

  headerBg:       'rgba(3, 23, 14, 0.95)',
  headerBorder:   'rgba(60, 74, 66, 0.4)',
  track:          '#1A2E22',
  divider:        '#162B20',

  orb1:           'rgba(52, 211, 153, 0.07)',
  orb2:           'rgba(252, 211, 77, 0.04)',

  inputBg:        'rgba(10, 22, 16, 0.5)',
  inputBorder:    'rgba(45, 74, 60, 0.35)',
  inputBorderFocus: '#34D399',
};

// ── Light: pastel gradient (peach → mint → teal → sage) ────────────────────
export const lightTheme: AppTheme = {
  // bg is the solid fallback; the actual background is the gradient below
  bg: '#D4ECE8',
  bgGradient: [
    'rgba(251,229,210,1)',
    'rgba(217,240,235,1)',
    'rgba(208,239,238,1)',
    'rgba(219,242,240,1)',
    'rgba(233,240,217,1)',
  ],
  bgGradientLocations: [0.0, 0.35, 0.51, 0.7, 1.0],
  bgGradientStart: {x: 0, y: 0.5},
  bgGradientEnd:   {x: 1, y: 0.5},

  // Near-opaque white cards — clean look on gradient background
  card:           'rgba(255, 255, 255, 0.96)',
  cardBorderTop:  'rgba(255, 255, 255, 0.98)',
  cardBorderSide: 'rgba(140, 195, 185, 0.35)',

  textPri:        '#1C3528',
  textSec:        '#47635A',
  textDis:        '#8FA898',
  textInverse:    '#FFFFFF',

  // Muted forest-teal accent (less saturated than dark mode emerald)
  emerald:        '#2A8B70',
  teal:           '#1B7A5E',
  gold:           '#B07038',   // warm terracotta (echoes the peach in gradient)
  error:          '#C44B4B',
  success:        '#2A8B70',

  // Opaque header so back-button tint is always readable
  headerBg:       'rgba(237, 247, 242, 0.98)',
  headerBorder:   'rgba(140, 195, 185, 0.30)',

  track:          'rgba(140, 195, 185, 0.30)',
  divider:        'rgba(140, 195, 185, 0.40)',

  orb1:           'rgba(180, 220, 210, 0.22)',
  orb2:           'rgba(251, 210, 175, 0.18)',

  inputBg:        'rgba(255, 255, 255, 0.62)',
  inputBorder:    'rgba(140, 195, 185, 0.45)',
  inputBorderFocus: '#2A8B70',
};
