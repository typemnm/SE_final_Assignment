import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Path, Line, Text as SvgText, Defs, LinearGradient, Stop, Rect} from 'react-native-svg';
import {colors} from '@theme/index';

interface ElevationPoint {
  altitude?: number;
  distance?: number;
}

interface ElevationChartProps {
  route: Array<{altitude?: number; timestamp?: string}>;
  totalDistanceKm: number;
  width?: number;
  height?: number;
}

export const ElevationChart = ({
  route,
  totalDistanceKm,
  width = 340,
  height = 120,
}: ElevationChartProps) => {
  const {path, minAlt, maxAlt, dataPoints} = useMemo(() => {
    const withAlt = route.filter(p => p.altitude != null && p.altitude !== 0);
    if (withAlt.length < 2) return {path: '', minAlt: 0, maxAlt: 0, dataPoints: []};

    const altitudes = withAlt.map(p => p.altitude as number);
    const min = Math.min(...altitudes);
    const max = Math.max(...altitudes);
    const range = max - min || 1;

    const padH = 32;
    const padV = 16;
    const chartW = width - padH;
    const chartH = height - padV * 2;

    const points = withAlt.map((p, i) => {
      const x = padH / 2 + (i / (withAlt.length - 1)) * chartW;
      const y = padV + chartH - ((p.altitude as number - min) / range) * chartH;
      return {x, y, alt: p.altitude as number};
    });

    const d = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const first = points[0];
    const last = points[points.length - 1];
    const closedPath = `${d} L ${last.x.toFixed(1)} ${(padV + chartH).toFixed(1)} L ${first.x.toFixed(1)} ${(padV + chartH).toFixed(1)} Z`;

    return {path: closedPath, minAlt: min, maxAlt: max, dataPoints: points};
  }, [route, width, height]);

  if (!path) {
    return (
      <View style={[styles.empty, {height}]}>
        <Text style={styles.emptyText}>고도 데이터 없음</Text>
      </View>
    );
  }

  const padH = 32;
  const padV = 16;
  const chartH = height - padV * 2;
  const chartW = width - padH;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.6" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* 배경 그리드 */}
        {[0, 0.5, 1].map(ratio => {
          const y = padV + ratio * chartH;
          const alt = Math.round(maxAlt - ratio * (maxAlt - minAlt));
          return (
            <React.Fragment key={ratio}>
              <Line
                x1={padH / 2}
                y1={y}
                x2={padH / 2 + chartW}
                y2={y}
                stroke="#E0E0E0"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <SvgText
                x={padH / 2 - 4}
                y={y + 4}
                fontSize="9"
                fill="#9E9E9E"
                textAnchor="end">
                {alt}m
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* 거리 라벨 */}
        {[0, 0.5, 1].map(ratio => {
          const x = padH / 2 + ratio * chartW;
          const km = (ratio * totalDistanceKm).toFixed(1);
          return (
            <SvgText
              key={ratio}
              x={x}
              y={height - 2}
              fontSize="9"
              fill="#9E9E9E"
              textAnchor="middle">
              {km}km
            </SvgText>
          );
        })}

        {/* 채워진 고도 그래프 */}
        <Path d={path} fill="url(#elevGrad)" />

        {/* 선만 다시 그리기 (채운 Path에 라인 포함 안되므로) */}
        <Path
          d={dataPoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(' ')}
          fill="none"
          stroke={colors.primary}
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  emptyText: {color: '#9E9E9E', fontSize: 13},
});
