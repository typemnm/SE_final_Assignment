import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemeContext} from '@theme/ThemeContext';
import type {RunningStats} from '../data/mockFeedData';

interface Props {
  visible: boolean;
  initialCaption?: string;
  initialHashtags?: string[];
  runningStats?: RunningStats;
  totalCalories?: number;
  onClose: () => void;
  onPost: (caption: string, hashtags: string[]) => void;
}

export const PostComposerSheet = ({
  visible,
  initialCaption = '',
  initialHashtags = ['#kelpus', '#건강기록'],
  runningStats,
  totalCalories,
  onClose,
  onPost,
}: Props) => {
  const {tc, isDark} = useThemeContext();
  const insets = useSafeAreaInsets();

  const [caption, setCaption] = useState(initialCaption);
  const [hashtagInput, setHashtagInput] = useState(initialHashtags.join(' '));
  const [posting, setPosting] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCaption(initialCaption);
      setHashtagInput(initialHashtags.join(' '));
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 55,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handlePost = async () => {
    if (!caption.trim()) return;
    setPosting(true);
    const tags = hashtagInput
      .split(/\s+/)
      .filter(t => t.startsWith('#') && t.length > 1);
    onPost(caption.trim(), tags);
    setPosting(false);
  };

  const bg = isDark ? '#0A1F14' : '#F0FAF4';
  const cardBg = isDark ? '#132B1C' : '#FFFFFF';
  const inputBg = isDark ? '#1A3526' : '#F5FBF7';
  const border = isDark ? 'rgba(52,211,153,0.18)' : 'rgba(16,185,129,0.2)';

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });
  const opacity = slideAnim;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.sheet,
            {backgroundColor: bg, paddingBottom: insets.bottom + 16},
            {opacity, transform: [{translateY}]},
          ]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">

              {/* 핸들 */}
              <View style={styles.handleWrap}>
                <View style={[styles.handle, {backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}]} />
              </View>

              {/* 헤더 */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                  <Text style={[styles.headerBtnTxt, {color: tc.textSec}]}>취소</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, {color: tc.textPri}]}>피드에 게시하기</Text>
                <TouchableOpacity
                  onPress={handlePost}
                  disabled={posting || !caption.trim()}
                  style={[
                    styles.postBtn,
                    {backgroundColor: tc.emerald},
                    (!caption.trim() || posting) && styles.postBtnDisabled,
                  ]}>
                  <Text style={styles.postBtnTxt}>
                    {posting ? '게시 중...' : '게시'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 기록 미리보기 뱃지 (running/diet 있을 때) */}
              {(runningStats || totalCalories) && (
                <View style={[styles.previewBadge, {backgroundColor: `${tc.emerald}18`, borderColor: `${tc.emerald}30`}]}>
                  {runningStats && (
                    <Text style={[styles.previewText, {color: tc.emerald}]}>
                      🏃 {runningStats.distanceKm}km · {runningStats.duration} · {runningStats.pace}
                    </Text>
                  )}
                  {totalCalories && (
                    <Text style={[styles.previewText, {color: tc.emerald}]}>
                      🍽️ {totalCalories.toLocaleString()}kcal 식단 분석
                    </Text>
                  )}
                </View>
              )}

              {/* 글 내용 입력 */}
              <View style={[styles.inputCard, {backgroundColor: cardBg, borderColor: border}]}>
                <Text style={[styles.inputLabel, {color: tc.textSec}]}>글 내용</Text>
                <TextInput
                  style={[styles.captionInput, {backgroundColor: inputBg, color: tc.textPri, borderColor: border}]}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  placeholder="오늘의 기록을 공유해보세요..."
                  placeholderTextColor={tc.textDis}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={[styles.charCount, {color: tc.textDis}]}>{caption.length}/500</Text>
              </View>

              {/* 해시태그 입력 */}
              <View style={[styles.inputCard, {backgroundColor: cardBg, borderColor: border, marginTop: 10}]}>
                <Text style={[styles.inputLabel, {color: tc.textSec}]}>해시태그</Text>
                <TextInput
                  style={[styles.hashtagInput, {backgroundColor: inputBg, color: tc.emerald, borderColor: border}]}
                  value={hashtagInput}
                  onChangeText={setHashtagInput}
                  placeholder="#kelpus #건강기록 #헬스"
                  placeholderTextColor={tc.textDis}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.inputHint, {color: tc.textDis}]}>
                  # 으로 시작하는 단어, 공백으로 구분
                </Text>
              </View>

              {/* 안내 */}
              <Text style={[styles.notice, {color: tc.textDis}]}>
                게시 후 앱 피드에 공개됩니다. 언제든지 삭제할 수 있습니다.
              </Text>

            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    maxHeight: '90%',
  },
  handleWrap: {alignItems: 'center', paddingTop: 10, paddingBottom: 4},
  handle: {width: 36, height: 4, borderRadius: 2},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  headerBtn: {width: 60},
  headerBtnTxt: {fontSize: 15},
  headerTitle: {flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700'},
  postBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnDisabled: {opacity: 0.4},
  postBtnTxt: {color: '#fff', fontWeight: '700', fontSize: 14},

  previewBadge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 4,
  },
  previewText: {fontSize: 13, fontWeight: '600'},

  inputCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  inputLabel: {fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3},
  captionInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
  },
  charCount: {fontSize: 11, textAlign: 'right', marginTop: 6},
  hashtagInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  inputHint: {fontSize: 11, marginTop: 6},

  notice: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 18,
  },
});
