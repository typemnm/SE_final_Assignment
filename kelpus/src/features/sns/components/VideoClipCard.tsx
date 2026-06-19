import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
} from 'react-native';
import type {VideoClip} from '../hooks/useVideoRecorder';
import {colors, typography, spacing} from '@theme/index';

interface Props {
  clip: VideoClip;
  index: number;
  onUpdateText: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}

export const VideoClipCard = ({clip, index, onUpdateText, onRemove}: Props) => {
  const [editing, setEditing] = useState(false);

  return (
    <View style={s.card}>
      {/* 썸네일 영역 */}
      <View style={s.thumbWrap}>
        {clip.thumbnailUri ? (
          <Image source={{uri: clip.thumbnailUri}} style={s.thumb} resizeMode="cover" />
        ) : (
          <View style={s.thumbPlaceholder}>
            <Text style={s.thumbIcon}>🎬</Text>
            <Text style={s.thumbNum}>#{index + 1}</Text>
          </View>
        )}

        {/* 중앙 텍스트 오버레이 미리보기 */}
        {clip.text.length > 0 && (
          <View style={s.textOverlay} pointerEvents="none">
            <Text style={s.overlayText} numberOfLines={2}>
              {clip.text}
            </Text>
          </View>
        )}

        {/* 5초 뱃지 */}
        <View style={s.durationBadge}>
          <Text style={s.durationText}>5초</Text>
        </View>
      </View>

      {/* 클립 정보 영역 */}
      <View style={s.info}>
        <View style={s.infoHeader}>
          <Text style={s.clipLabel}>클립 {index + 1}</Text>
          <TouchableOpacity
            onPress={() => onRemove(clip.id)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={s.removeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <TextInput
            style={s.textInput}
            value={clip.text}
            onChangeText={t => onUpdateText(clip.id, t)}
            placeholder="영상 중앙에 표시할 텍스트..."
            placeholderTextColor={colors.text.disabled}
            autoFocus
            onBlur={() => setEditing(false)}
            returnKeyType="done"
            onSubmitEditing={() => setEditing(false)}
            maxLength={30}
          />
        ) : (
          <TouchableOpacity
            style={s.textTap}
            onPress={() => setEditing(true)}
            activeOpacity={0.7}>
            <Text style={clip.text ? s.textValue : s.textPlaceholder}>
              {clip.text || '+ 텍스트 추가 (탭해서 편집)'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={s.textHint}>최대 30자 · 영상 중앙에 흰 글씨로 표시됩니다</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbWrap: {
    width: 96,
    height: 96,
  },
  thumb: {
    width: 96,
    height: 96,
  },
  thumbPlaceholder: {
    width: 96,
    height: 96,
    backgroundColor: colors.surfaceBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: {fontSize: 26},
  thumbNum: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
    fontWeight: '700',
  },
  textOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {fontSize: 9, color: '#fff', fontWeight: '700'},

  info: {
    flex: 1,
    padding: spacing.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  clipLabel: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.text.primary,
  },
  removeBtn: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '700',
  },
  textTap: {
    backgroundColor: colors.surfaceBright,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  textValue: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textPlaceholder: {
    ...typography.caption,
    color: colors.text.disabled,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: colors.surfaceBright,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  textHint: {
    ...typography.caption,
    color: colors.text.disabled,
    marginTop: 4,
    fontSize: 9,
  },
});
