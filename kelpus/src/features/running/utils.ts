import type {TrackingPoint} from './types';

export const fmtKm = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(2)}km`;
};

export const fmtMinPerKm = (minPerKm: number): string => {
  if (!minPerKm || !isFinite(minPerKm) || minPerKm <= 0) return "--'--\"";
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};

export const fmtElapsed = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

export const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const calcDistanceKm = (route: TrackingPoint[]): number => {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += haversineKm(
      route[i - 1].latitude,
      route[i - 1].longitude,
      route[i].latitude,
      route[i].longitude,
    );
  }
  return Math.round(total * 1000) / 1000;
};

export const calcPaceMinPerKm = (distanceKm: number, elapsedSeconds: number): number => {
  if (distanceKm <= 0) return 0;
  return elapsedSeconds / 60 / distanceKm;
};

export const estimateCalories = (distanceKm: number): number =>
  Math.round(distanceKm * 65);

export const difficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case '쉬움':
      return '#4CAF50';
    case '보통':
      return '#FF9800';
    case '어려움':
      return '#F44336';
    default:
      return '#757575';
  }
};

// pace(분/km) → 속도 색상 (빠를수록 초록, 느릴수록 빨강)
export const paceToColor = (pace: number, avgPace: number): string => {
  if (pace <= 0 || avgPace <= 0) return '#9E9E9E';
  const ratio = pace / avgPace;
  if (ratio <= 0.85) return '#00BCD4'; // 매우 빠름 - 하늘색
  if (ratio <= 0.95) return '#4CAF50'; // 빠름 - 초록
  if (ratio <= 1.05) return '#8BC34A'; // 평균
  if (ratio <= 1.15) return '#FF9800'; // 느림 - 주황
  if (ratio <= 1.3) return '#FF5722'; // 매우 느림 - 주황빨강
  return '#F44336'; // 아주 느림 - 빨강
};

export interface PaceSegment {
  coordinates: Array<{latitude: number; longitude: number}>;
  pace: number;
  color: string;
}

// GPS 경로를 페이스별 색상 구간으로 분할 (200m 단위)
export const buildPaceSegments = (
  route: Array<{latitude?: number; longitude?: number; lat?: number; lng?: number; altitude?: number; timestamp: string}>,
  avgPace: number,
): PaceSegment[] => {
  if (route.length < 2) return [];

  const SEGMENT_KM = 0.2;
  const segments: PaceSegment[] = [];
  let segStart = 0;
  let segDist = 0;
  let segSeconds = 0;

  const getCoord = (p: typeof route[number]) => ({
    latitude: p.latitude ?? p.lat ?? 0,
    longitude: p.longitude ?? p.lng ?? 0,
  });

  for (let i = 1; i < route.length; i++) {
    const prev = getCoord(route[i - 1]);
    const cur = getCoord(route[i]);
    const d = haversineKm(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
    const prevTs = new Date(route[i - 1].timestamp).getTime();
    const curTs = new Date(route[i].timestamp).getTime();
    const dt = isNaN(prevTs) || isNaN(curTs) ? 0 : (curTs - prevTs) / 1000;

    segDist += d;
    segSeconds += dt;

    if (segDist >= SEGMENT_KM || i === route.length - 1) {
      const pace = segDist > 0 && segSeconds > 0 ? segSeconds / 60 / segDist : avgPace;
      const coords = route.slice(segStart, i + 1).map(getCoord);
      segments.push({coordinates: coords, pace, color: paceToColor(pace, avgPace)});
      segStart = i;
      segDist = 0;
      segSeconds = 0;
    }
  }

  return segments;
};

export const calcElevationGain = (
  route: Array<{altitude?: number}>,
): number => {
  let gain = 0;
  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1].altitude ?? 0;
    const cur = route[i].altitude ?? 0;
    if (cur > prev) gain += cur - prev;
  }
  return Math.round(gain);
};
