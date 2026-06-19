import {Platform} from 'react-native';

interface GeoCoords {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
}

interface GeoPosition {
  coords: GeoCoords;
  timestamp: number;
}

interface GeoError {
  code: number;
  message: string;
}

interface GeoOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}

// ── 창원대학교 정문 기준 mock GPS 경로 (시계 방향 루프, ~2초 간격) ──
const MOCK_ROUTE: Array<{lat: number; lng: number}> = [
  {lat: 35.24108, lng: 128.69137}, // 정문
  {lat: 35.24138, lng: 128.69180},
  {lat: 35.24172, lng: 128.69228},
  {lat: 35.24210, lng: 128.69275},
  {lat: 35.24248, lng: 128.69318},
  {lat: 35.24285, lng: 128.69365},
  {lat: 35.24318, lng: 128.69410},
  {lat: 35.24340, lng: 128.69460},
  {lat: 35.24348, lng: 128.69515},
  {lat: 35.24335, lng: 128.69568},
  {lat: 35.24308, lng: 128.69610},
  {lat: 35.24270, lng: 128.69638},
  {lat: 35.24228, lng: 128.69648},
  {lat: 35.24185, lng: 128.69630},
  {lat: 35.24148, lng: 128.69598},
  {lat: 35.24118, lng: 128.69558},
  {lat: 35.24098, lng: 128.69510},
  {lat: 35.24090, lng: 128.69455},
  {lat: 35.24095, lng: 128.69398},
  {lat: 35.24100, lng: 128.69340},
  {lat: 35.24103, lng: 128.69280},
  {lat: 35.24106, lng: 128.69210},
  {lat: 35.24108, lng: 128.69137}, // 정문 복귀
];

const mockTimers = new Map<number, ReturnType<typeof setInterval>>();
let mockIdSeed = 9000;

function mockWatchPosition(
  onSuccess: (pos: GeoPosition) => void,
  _onError: (err: GeoError) => void,
  _options?: GeoOptions,
): number {
  const id = mockIdSeed++;
  let idx = 0;

  const emit = () => {
    if (idx >= MOCK_ROUTE.length) {
      clearInterval(timer);
      mockTimers.delete(id);
      return;
    }
    const {lat, lng} = MOCK_ROUTE[idx++];
    onSuccess({
      coords: {latitude: lat, longitude: lng, altitude: null, accuracy: 5},
      timestamp: Date.now(),
    });
  };

  emit(); // 첫 포인트 즉시 발송
  const timer = setInterval(emit, 2000);
  mockTimers.set(id, timer);
  return id;
}

function mockClearWatch(id: number) {
  const t = mockTimers.get(id);
  if (t) {
    clearInterval(t);
    mockTimers.delete(id);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const global: Record<string, any>;
const _geo: any =
  (global as any)?.navigator?.geolocation ??
  (globalThis as any)?.navigator?.geolocation;

const isWeb = Platform.OS === 'web';

export const Geo = {
  isAvailable: () => isWeb || Boolean(_geo),

  watchPosition: (
    onSuccess: (pos: GeoPosition) => void,
    onError: (err: GeoError) => void,
    options?: GeoOptions,
  ): number => {
    if (isWeb) return mockWatchPosition(onSuccess, onError, options);
    if (!_geo) return -1;
    return _geo.watchPosition(onSuccess, onError, options) as number;
  },

  clearWatch: (watchId: number): void => {
    if (isWeb) {
      mockClearWatch(watchId);
      return;
    }
    if (_geo && watchId !== -1) _geo.clearWatch(watchId);
  },

  getCurrentPosition: (
    onSuccess: (pos: GeoPosition) => void,
    onError: (err: GeoError) => void,
    options?: GeoOptions,
  ): void => {
    if (isWeb) {
      mockWatchPosition(pos => { onSuccess(pos); }, onError, options);
      return;
    }
    if (!_geo) return;
    _geo.getCurrentPosition(onSuccess, onError, options);
  },
};
