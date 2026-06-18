import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {useThemeContext} from '@theme/ThemeContext';
import type {MockFeedPost, RunningStats} from '../data/mockFeedData';

const fmtCount = (n: number): string => {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const fmtTime = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

interface StatBoxProps {
  label: string;
  value: string;
  valueColor: string;
  secColor: string;
}

const StatBox = ({label, value, valueColor, secColor}: StatBoxProps) => (
  <View style={sst.statBox}>
    <Text style={[sst.statVal, {color: valueColor}]}>{value}</Text>
    <Text style={[sst.statLabel, {color: secColor}]}>{label}</Text>
  </View>
);

interface RunningCardProps {
  stats: RunningStats;
}

const RunningStatsCard = ({stats}: RunningCardProps) => {
  const {tc} = useThemeContext();
  return (
    <View style={[sst.statsWrap, {backgroundColor: tc.inputBg, borderColor: tc.divider}]}>
      <View style={sst.statsHeader}>
        <Text style={sst.statsRunEmoji}>🏃‍♂️</Text>
        <Text style={[sst.statsAppLabel, {color: tc.emerald}]}>KELPUS 러닝 기록</Text>
        <Text style={sst.statsReelBadge}>🎬</Text>
      </View>
      <View style={sst.statsRow}>
        <StatBox label="거리" value={`${stats.distanceKm}km`} valueColor={tc.emerald} secColor={tc.textSec} />
        <View style={[sst.statDivider, {backgroundColor: tc.divider}]} />
        <StatBox label="시간" value={stats.duration} valueColor={tc.textPri} secColor={tc.textSec} />
        <View style={[sst.statDivider, {backgroundColor: tc.divider}]} />
        <StatBox label="페이스" value={stats.pace} valueColor={tc.textPri} secColor={tc.textSec} />
        <View style={[sst.statDivider, {backgroundColor: tc.divider}]} />
        <StatBox label="칼로리" value={`${stats.calories}`} valueColor={tc.gold} secColor={tc.textSec} />
      </View>
      {stats.steps != null && (
        <Text style={[sst.stepsText, {color: tc.textDis}]}>👟 {stats.steps.toLocaleString()} 걸음</Text>
      )}
    </View>
  );
};

interface Props {
  post: MockFeedPost;
  onPress: () => void;
  onDelete?: () => void;
}

export const FeedThreadCard = ({post, onPress, onDelete}: Props) => {
  const {tc} = useThemeContext();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likesCount);

  const hasImage = Boolean(post.image);
  const hasStats = Boolean(post.runningStats);
  const hasMedia = hasImage || hasStats;

  const handleLike = () => {
    setLiked(prev => {
      setLikeCount(c => prev ? c - 1 : c + 1);
      return !prev;
    });
  };

  return (
    <View
      style={[
        st.card,
        {
          backgroundColor: tc.card,
          borderTopColor: tc.cardBorderTop,
          borderLeftColor: tc.cardBorderSide,
          borderRightColor: tc.cardBorderSide,
          borderBottomColor: tc.cardBorderSide,
        },
      ]}>

      {/* ── Author row ──────────────────────────────────────── */}
      <View style={st.authorRow}>
        <ImageBackground
          source={{uri: post.author.profileImage}}
          style={st.avatar}
          imageStyle={st.avatarImg}>
          <View style={[st.avatarRing, {borderColor: 'rgba(52,211,153,0.8)'}]} />
        </ImageBackground>
        <View style={st.authorInfo}>
          <View style={st.nameRow}>
            <Text style={[st.displayName, {color: tc.textPri}]}>{post.author.displayName}</Text>
            {onDelete && (
              <View style={[st.myBadge, {backgroundColor: `${tc.emerald}22`, borderColor: `${tc.emerald}55`}]}>
                <Text style={[st.myBadgeText, {color: tc.emerald}]}>내 게시물</Text>
              </View>
            )}
          </View>
          <Text style={[st.handle, {color: tc.textSec}]}>
            @{post.author.username} · {fmtTime(post.postedAt)}
          </Text>
        </View>
        {onDelete ? (
          <TouchableOpacity
            style={st.deleteBtn}
            onPress={() =>
              Alert.alert('게시물 삭제', '이 게시물을 삭제할까요?', [
                {text: '취소', style: 'cancel'},
                {text: '삭제', style: 'destructive', onPress: onDelete},
              ])
            }
            activeOpacity={0.65}>
            <Text style={st.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[st.moreBtn, {color: tc.textDis}]}>···</Text>
        )}
      </View>

      {/* ── Caption preview ─────────────────────────────────── */}
      <Text
        style={[st.captionPreview, {color: tc.textPri}]}
        numberOfLines={hasMedia ? 2 : 4}>
        {post.caption}
      </Text>

      {/* ── Running stats card ──────────────────────────────── */}
      {hasStats && post.runningStats && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={st.mediaWrap}>
          <RunningStatsCard stats={post.runningStats} />
          <View style={st.reelsBadge}>
            <Text style={st.reelsBadgeText}>▶  릴스로 보기</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Photo (tap = open reels) ─────────────────────────── */}
      {hasImage && !hasStats && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={st.mediaWrap}>
          <Image
            source={{uri: post.image}}
            style={st.image}
            resizeMode="cover"
          />
          <View style={st.reelsBadge}>
            <Text style={st.reelsBadgeText}>▶  릴스로 보기</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Hashtags ────────────────────────────────────────── */}
      <Text style={[st.hashtags, {color: tc.emerald}]} numberOfLines={1}>
        {post.hashtags.join('  ')}
      </Text>

      {/* ── Action bar ──────────────────────────────────────── */}
      <View style={[st.actions, {borderTopColor: tc.divider}]}>
        <TouchableOpacity style={st.action} onPress={handleLike} activeOpacity={0.75}>
          <Text style={st.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={[st.actionCount, {color: tc.textSec}]}>{fmtCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.action} onPress={onPress} activeOpacity={0.75}>
          <Text style={st.actionIcon}>💬</Text>
          <Text style={[st.actionCount, {color: tc.textSec}]}>{fmtCount(post.commentsCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.action} activeOpacity={0.75}>
          <Text style={st.actionIcon}>↗️</Text>
          <Text style={[st.actionCount, {color: tc.textSec}]}>공유</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={st.action}
          onPress={() => setSaved(prev => !prev)}
          activeOpacity={0.75}>
          <Text style={st.actionIcon}>{saved ? '🔖' : '📌'}</Text>
          <Text style={[st.actionCount, {color: tc.textSec}]}>저장</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Running stats card styles ────────────────────────────────────────────────
const sst = StyleSheet.create({
  statsWrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  statsRunEmoji: {fontSize: 15},
  statsAppLabel: {flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 0.3},
  statsReelBadge: {fontSize: 13},
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statBox: {flex: 1, alignItems: 'center'},
  statVal: {fontSize: 16, fontWeight: '800'},
  statLabel: {fontSize: 11, marginTop: 3},
  statDivider: {width: 1, height: 34},
  stepsText: {fontSize: 11, marginTop: 10, textAlign: 'center'},
});

// ── Thread card styles ───────────────────────────────────────────────────────
const st = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    marginHorizontal: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  avatar: {width: 40, height: 40},
  avatarImg: {borderRadius: 20},
  avatarRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 2,
  },
  authorInfo: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  displayName: {fontSize: 14, fontWeight: '700'},
  handle: {fontSize: 12, marginTop: 1},
  myBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  myBadgeText: {fontSize: 10, fontWeight: '700'},
  moreBtn: {fontSize: 18, letterSpacing: 1, paddingHorizontal: 4},
  deleteBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 18,
  },
  deleteBtnText: {fontSize: 18},

  captionPreview: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  mediaWrap: {
    marginHorizontal: 14,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  image: {width: '100%', height: 220},
  reelsBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reelsBadgeText: {color: '#fff', fontSize: 12, fontWeight: '700'},

  hashtags: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 14,
    marginBottom: 6,
  },

  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: 4,
    paddingHorizontal: 6,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  actionIcon: {fontSize: 16},
  actionCount: {fontSize: 12, fontWeight: '600'},
});
