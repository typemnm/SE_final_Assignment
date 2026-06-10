import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {captureRef} from 'react-native-view-shot';
import type {ReelFrame} from '../hooks/useReelCreator';
import {DietSlideFrame} from './DietSlideFrame';
import {RunningSlideFrame} from './RunningSlideFrame';

const SLIDE_DURATION_MS = 4000;
const {width: SCREEN_WIDTH} = Dimensions.get('window');

const FULL_WIDTH = SCREEN_WIDTH - 32;
const COMPACT_WIDTH = Math.round(SCREEN_WIDTH * 0.57);

export interface ReelPreviewPlayerHandle {
  /** 현재 보이는 슬라이드를 jpg 파일 URI로 캡처해서 반환 */
  captureCurrentFrame(): Promise<string>;
}

interface Props {
  frames: ReelFrame[];
  onDone?: () => void;
  compact?: boolean;
}

export const ReelPreviewPlayer = forwardRef<ReelPreviewPlayerHandle, Props>(
  ({frames, onDone, compact = false}, ref) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const animRef = useRef<Animated.CompositeAnimation | null>(null);
    const containerRef = useRef<View>(null);

    const playerWidth = compact ? COMPACT_WIDTH : FULL_WIDTH;
    const playerHeight = Math.round(playerWidth * (16 / 9));

    useImperativeHandle(ref, () => ({
      async captureCurrentFrame(): Promise<string> {
        return captureRef(containerRef, {
          format: 'jpg',
          quality: 0.92,
          result: 'tmpfile',
        });
      },
    }));

    useEffect(() => {
      progressAnim.setValue(0);
      animRef.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration: SLIDE_DURATION_MS,
        useNativeDriver: false,
      });
      animRef.current.start(({finished}) => {
        if (!finished) return;
        if (activeIdx < frames.length - 1) {
          setActiveIdx(i => i + 1);
        } else {
          onDone?.();
        }
      });
      return () => animRef.current?.stop();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIdx, frames.length]);

    const goNext = () => {
      animRef.current?.stop();
      if (activeIdx < frames.length - 1) setActiveIdx(i => i + 1);
      else onDone?.();
    };

    const goPrev = () => {
      animRef.current?.stop();
      setActiveIdx(i => Math.max(0, i - 1));
    };

    const frame = frames[activeIdx];
    if (!frame) return null;

    return (
      <View
        ref={containerRef}
        style={[styles.container, {width: playerWidth, height: playerHeight}]}>
        {/* 스토리 진행 바 */}
        <View style={styles.barsRow}>
          {frames.map((_, i) => (
            <View key={i} style={styles.barTrack}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: '#fff',
                    width: (
                      i < activeIdx
                        ? '100%'
                        : i === activeIdx
                        ? progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : '0%'
                    ) as any,
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* 슬라이드 내용 */}
        <View style={styles.slideArea}>
          {frame.type === 'diet' ? (
            <DietSlideFrame frame={frame} compact={compact} />
          ) : (
            <RunningSlideFrame frame={frame} compact={compact} />
          )}
        </View>

        {/* 이전/다음 탭 영역 */}
        <TouchableOpacity style={styles.prevArea} onPress={goPrev} activeOpacity={1} />
        <TouchableOpacity style={styles.nextArea} onPress={goNext} activeOpacity={1} />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  barsRow: {
    position: 'absolute',
    top: 14,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  barTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  slideArea: {flex: 1, paddingTop: 38},
  prevArea: {position: 'absolute', left: 0, top: 38, bottom: 0, width: '35%'},
  nextArea: {position: 'absolute', right: 0, top: 38, bottom: 0, width: '65%'},
});
