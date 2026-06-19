import {useCallback, useEffect, useRef} from 'react';
import {Alert, Platform} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {check, request, PERMISSIONS, RESULTS, openSettings} from 'react-native-permissions';
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

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  const permission = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  const current = await check(permission);

  if (current === RESULTS.GRANTED) return true;

  if (current === RESULTS.BLOCKED) {
    Alert.alert(
      'GPS 권한 차단됨',
      '위치 권한이 차단되어 있습니다. 설정에서 직접 허용해 주세요.',
      [
        {text: '취소', style: 'cancel'},
        {text: '설정 열기', onPress: openSettings},
      ],
    );
    return false;
  }

  const result = await request(permission);
  if (result !== RESULTS.GRANTED) {
    Alert.alert('위치 권한 필요', 'GPS 러닝을 사용하려면 위치 권한이 필요합니다.');
    return false;
  }
  return true;
};

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
      err => {
        console.warn('[GPS error]', err.code, err.message);
        if (err.code === 1 /* PERMISSION_DENIED */ && Platform.OS === 'android') {
          Alert.alert('GPS 권한 없음', '위치 권한이 거부되었습니다. 설정에서 허용해 주세요.', [
            {text: '확인'},
            {text: '설정 열기', onPress: openSettings},
          ]);
        }
      },
      {enableHighAccuracy: true, maximumAge: 0, timeout: 15000},
    );
  }, [dispatch]);

  const startTracking = useCallback(async () => {
    const granted = await requestLocationPermission();
    if (!granted) return;

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

  const resumeTracking = useCallback(async () => {
    const granted = await requestLocationPermission();
    if (!granted) return;

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
