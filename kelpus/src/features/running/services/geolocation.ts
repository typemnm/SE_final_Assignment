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

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const global: Record<string, any>;
const _geo: any = (global as any)?.navigator?.geolocation ?? (globalThis as any)?.navigator?.geolocation;

export const Geo = {
  isAvailable: () => Boolean(_geo),

  watchPosition: (
    onSuccess: (pos: GeoPosition) => void,
    onError: (err: GeoError) => void,
    options?: GeoOptions,
  ): number => {
    if (!_geo) return -1;
    return _geo.watchPosition(onSuccess, onError, options) as number;
  },

  clearWatch: (watchId: number): void => {
    if (_geo && watchId !== -1) _geo.clearWatch(watchId);
  },

  getCurrentPosition: (
    onSuccess: (pos: GeoPosition) => void,
    onError: (err: GeoError) => void,
    options?: GeoOptions,
  ): void => {
    if (!_geo) return;
    _geo.getCurrentPosition(onSuccess, onError, options);
  },
};
