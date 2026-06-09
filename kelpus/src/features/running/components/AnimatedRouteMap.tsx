import React, {useEffect, useRef, useMemo, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, useWindowDimensions} from 'react-native';
import Svg, {Path, Circle, Rect, Line} from 'react-native-svg';

type RoutePoint = {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  timestamp?: string;
};

interface AnimatedRouteMapProps {
  route: RoutePoint[];
  height?: number;
  autoPlay?: boolean;
  animationDuration?: number;
  horizontalPadding?: number;
}

export const AnimatedRouteMap = ({
  route,
  height = 300,
  autoPlay = true,
  animationDuration = 3000,
  horizontalPadding = 32,
}: AnimatedRouteMapProps) => {
  const {width: screenWidth} = useWindowDimensions();
  const mapWidth = screenWidth - horizontalPadding;

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const getCoord = (p: RoutePoint) => ({
    lat: p.lat ?? p.latitude ?? 0,
    lng: p.lng ?? p.longitude ?? 0,
  });

  const svgPoints = useMemo(() => {
    if (route.length < 2) return [];
    const coords = route.map(getCoord);
    const lats = coords.map(c => c.lat);
    const lngs = coords.map(c => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const pad = 36;
    const availW = mapWidth - pad * 2;
    const availH = height - pad * 2;
    const routeAspect = lngRange / latRange;
    const spaceAspect = availW / availH;
    let drawW = availW;
    let drawH = availH;
    if (routeAspect > spaceAspect) {
      drawH = drawW / routeAspect;
    } else {
      drawW = drawH * routeAspect;
    }
    const ox = (mapWidth - drawW) / 2;
    const oy = (height - drawH) / 2;
    return coords.map(c => ({
      x: ox + ((c.lng - minLng) / lngRange) * drawW,
      y: oy + drawH - ((c.lat - minLat) / latRange) * drawH,
    }));
  }, [route, mapWidth, height]);

  const stopAnim = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startAnim = () => {
    stopAnim();
    setProgress(0);
    setPlaying(true);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const p = Math.min((Date.now() - startRef.current) / animationDuration, 1);
      setProgress(p);
      if (p >= 1) {
        stopAnim();
        setPlaying(false);
      }
    }, 16);
  };

  useEffect(() => {
    if (autoPlay && svgPoints.length >= 2) {
      startAnim();
    }
    return stopAnim;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgPoints.length]);

  if (svgPoints.length < 2) {
    return (
      <View style={[styles.container, {height, width: mapWidth}]}>
        <Text style={styles.noData}>경로 데이터 없음</Text>
      </View>
    );
  }

  // Phase 1 (0→65%): 경로 그리기
  const drawPhase = Math.min(progress / 0.65, 1);
  const nVisible = Math.max(2, Math.round(drawPhase * svgPoints.length));
  const drawnPath = svgPoints
    .slice(0, nVisible)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // 전체 경로 (흐릿한 가이드)
  const fullPath = svgPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Phase 2 (65%→100%): 러너 도트 이동
  const runPhase = Math.max((progress - 0.65) / 0.35, 0);
  const runIdx = Math.min(Math.round(runPhase * (svgPoints.length - 1)), svgPoints.length - 1);
  const runnerPos = svgPoints[runIdx];
  const showRunner = runPhase > 0.01;
  const showEnd = drawPhase >= 0.98;

  const startPt = svgPoints[0];
  const endPt = svgPoints[svgPoints.length - 1];

  return (
    <View style={[styles.container, {height, width: mapWidth}]}>
      <Svg width={mapWidth} height={height}>
        {/* 다크 맵 배경 */}
        <Rect width={mapWidth} height={height} fill="#0d1117" />

        {/* 그리드 라인 */}
        {[1, 2, 3, 4].map(i => (
          <Line
            key={`h${i}`}
            x1={0} y1={(height / 5) * i}
            x2={mapWidth} y2={(height / 5) * i}
            stroke="#151c28" strokeWidth={1}
          />
        ))}
        {[1, 2, 3, 4, 5].map(i => (
          <Line
            key={`v${i}`}
            x1={(mapWidth / 6) * i} y1={0}
            x2={(mapWidth / 6) * i} y2={height}
            stroke="#151c28" strokeWidth={1}
          />
        ))}

        {/* 가이드 경로 (반투명) */}
        <Path
          d={fullPath}
          stroke="#1e3a4a"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
        />

        {/* 애니메이션 경로 */}
        <Path
          d={drawnPath}
          stroke="#00E5FF"
          strokeWidth={3.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 출발 마커 */}
        <Circle cx={startPt.x} cy={startPt.y} r={10} fill="#4CAF5033" />
        <Circle cx={startPt.x} cy={startPt.y} r={6} fill="#4CAF50" />
        <Circle cx={startPt.x} cy={startPt.y} r={2.5} fill="#fff" />

        {/* 도착 마커 (경로 그리기 완료 후 등장) */}
        {showEnd && (
          <>
            <Circle cx={endPt.x} cy={endPt.y} r={10} fill="#F4433633" />
            <Circle cx={endPt.x} cy={endPt.y} r={6} fill="#F44336" />
            <Circle cx={endPt.x} cy={endPt.y} r={2.5} fill="#fff" />
          </>
        )}

        {/* 러너 도트 (글로우 효과) */}
        {showRunner && (
          <>
            <Circle cx={runnerPos.x} cy={runnerPos.y} r={18} fill="#FFEB3B18" />
            <Circle cx={runnerPos.x} cy={runnerPos.y} r={12} fill="#FFEB3B40" />
            <Circle cx={runnerPos.x} cy={runnerPos.y} r={7} fill="#FFEB3B" />
            <Circle cx={runnerPos.x} cy={runnerPos.y} r={3} fill="#fff" />
          </>
        )}
      </Svg>

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, {backgroundColor: '#4CAF50'}]} />
          <Text style={styles.legendText}>출발</Text>
        </View>
        {showEnd && (
          <View style={styles.legendItem}>
            <View style={[styles.dot, {backgroundColor: '#F44336'}]} />
            <Text style={styles.legendText}>도착</Text>
          </View>
        )}
        {showRunner && (
          <View style={styles.legendItem}>
            <View style={[styles.dot, {backgroundColor: '#FFEB3B'}]} />
            <Text style={styles.legendText}>러너</Text>
          </View>
        )}
      </View>

      {/* 다시 보기 버튼 */}
      {!playing && progress >= 1 && (
        <TouchableOpacity style={styles.replayBtn} onPress={startAnim} activeOpacity={0.8}>
          <Text style={styles.replayText}>▶ 다시 보기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1117',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  noData: {
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 80,
    fontSize: 14,
  },
  legend: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 5},
  dot: {width: 8, height: 8, borderRadius: 4},
  legendText: {color: 'rgba(255,255,255,0.55)', fontSize: 11},
  replayBtn: {
    position: 'absolute',
    bottom: 10,
    right: 16,
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  replayText: {color: '#00E5FF', fontSize: 12, fontWeight: '600'},
});
