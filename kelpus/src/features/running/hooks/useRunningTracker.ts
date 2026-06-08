import {useCallback, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {
  setTrackingStatus,
  addRoutePoint,
  incrementElapsedSeconds,
  resetTracking,
} from '../store/runningSlice';
import {runningService} from '../services/runningService';
import {Geo} from '../services/geolocation';
import {calcDistanceKm, calcPaceMinPerKm, estimateCalories} from '../utils';
import type {TrackingPoint} from '../types';

export const useRunningTracker = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tracking = useSelector((state: RootState) => state.running.tracking);

  const watchIdRef = useRef<number>(-1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeRef = useRef<TrackingPoint[]>([]);

  // keep routeRef in sync with Redux state for watchPosition callback
  routeRef.current = tracking.route;

  const _stopWatch = useCallback(() => {
    Geo.clearWatch(watchIdRef.current);
    watchIdRef.current = -1;
  }, []);

  const _stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const _startWatch = useCallback(() => {
    watchIdRef.current = Geo.watchPosition(
      position => {
        const point: TrackingPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude ?? undefined,
          timestamp: new Date(position.timestamp).toISOString(),
        };
        const newRoute = [...routeRef.current, point];
        const newDistanceKm = calcDistanceKm(newRoute);
        dispatch(addRoutePoint({point, newDistanceKm}));
      },
      _err => { /* 위치 오류 무시 */ },
      {enableHighAccuracy: true, maximumAge: 0},
    );
  }, [dispatch]);

  const startTracking = useCallback(() => {
    dispatch(setTrackingStatus('tracking'));
    timerRef.current = setInterval(() => {
      dispatch(incrementElapsedSeconds());
    }, 1000);
    _startWatch();
  }, [dispatch, _startWatch]);

  const pauseTracking = useCallback(() => {
    dispatch(setTrackingStatus('paused'));
    _stopTimer();
    _stopWatch();
  }, [dispatch, _stopTimer, _stopWatch]);

  const resumeTracking = useCallback(() => {
    dispatch(setTrackingStatus('tracking'));
    timerRef.current = setInterval(() => {
      dispatch(incrementElapsedSeconds());
    }, 1000);
    _startWatch();
  }, [dispatch, _startWatch]);

  const finishTracking = useCallback(() => {
    dispatch(setTrackingStatus('finished'));
    _stopTimer();
    _stopWatch();
  }, [dispatch, _stopTimer, _stopWatch]);

  const saveRun = useCallback(async (): Promise<void> => {
    const {route, elapsedSeconds, distanceKm} = tracking;
    const avgPace = calcPaceMinPerKm(distanceKm, elapsedSeconds);
    const calories = estimateCalories(distanceKm);

    const gpsCoordinates = route.map(p => ({
      lat: p.latitude,
      lng: p.longitude,
      altitude: p.altitude,
      timestamp: p.timestamp,
    }));

    await runningService.syncRecord({
      distance: distanceKm,
      avg_pace: avgPace,
      gps_coordinates: gpsCoordinates,
      duration_seconds: elapsedSeconds,
      calories,
    });

    dispatch(resetTracking());
  }, [dispatch, tracking]);

  const discardRun = useCallback(() => {
    _stopTimer();
    _stopWatch();
    dispatch(resetTracking());
  }, [dispatch, _stopTimer, _stopWatch]);

  useEffect(() => {
    return () => {
      _stopTimer();
      _stopWatch();
    };
  }, [_stopTimer, _stopWatch]);

  const currentPosition =
    tracking.route.length > 0
      ? {
          latitude: tracking.route[tracking.route.length - 1].latitude,
          longitude: tracking.route[tracking.route.length - 1].longitude,
        }
      : null;

  return {
    tracking,
    currentPosition,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
    saveRun,
    discardRun,
  };
};
