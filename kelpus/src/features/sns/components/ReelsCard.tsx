import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {MockFeedPost, RunningStats} from '../data/mockFeedData';

const TAB_BAR_H = 64;

const fmtCount = (n: number): string => {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

interface Props {
  post: MockFeedPost;
  height: number;
  onPressDetail: () => void;
}

// ── Full-screen running stats panel ─────────────────────────────────────────
const RunningStatsPanel = ({stats}: {stats: RunningStats}) => (
  <View style={rp.panel}>
    <View style={rp.card}>
      <Text style={rp.header}>🏃‍♂️  KELPUS 러닝 기록</Text>
      <View style={rp.mainRow}>
        <View style={rp.mainItem}>
          <Text style={[rp.bigVal, rp.green]}>{stats.distanceKm}</Text>
          <Text style={rp.unit}>km</Text>
          <Text style={rp.key}>거리</Text>
        </View>
        <View style={rp.divider} />
        <View style={rp.mainItem}>
          <Text style={rp.bigVal}>{stats.duration}</Text>
          <Text style={rp.key}>시간</Text>
        </View>
        <View style={rp.divider} />
        <View style={rp.mainItem}>
          <Text style={rp.bigVal}>{stats.pace}</Text>
          <Text style={rp.key}>페이스</Text>
        </View>
      </View>
      <View style={rp.calRow}>
        <Text style={rp.calLabel}>소모 칼로리</Text>
        <Text style={[rp.calVal, rp.gold]}>{stats.calories} kcal</Text>
      </View>
      {stats.steps != null && (
        <Text style={rp.steps}>👟 {stats.steps.toLocaleString()} 걸음</Text>
      )}
    </View>
  </View>
);

const rp = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: 'rgba(10, 30, 20, 0.82)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.30)',
    padding: 26,
    width: '100%',
  },
  header: {
    color: 'rgba(52, 211, 153, 0.95)',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 20,
    textAlign: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  mainItem: {flex: 1, alignItems: 'center'},
  bigVal: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  unit: {color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1},
  key: {color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4},
  green: {color: '#34D399'},
  gold: {color: '#FCD34D'},
  divider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
  },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 211, 153, 0.20)',
    paddingTop: 14,
  },
  calLabel: {color: 'rgba(255,255,255,0.55)', fontSize: 13},
  calVal: {fontSize: 20, fontWeight: '700'},
  steps: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});

// ── Main card ────────────────────────────────────────────────────────────────
export const ReelsCard = ({post, height, onPressDetail}: Props) => {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likesCount);

  const heartScale = useRef(new Animated.Value(1)).current;
  const discSpin   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(discSpin, {toValue: 1, duration: 5000, useNativeDriver: true}),
    );
    loop.start();
    return () => loop.stop();
  }, [discSpin]);

  const handleLike = () => {
    const wasLiked = liked;
    setLiked(prev => !prev);
    setLikeCount(c => (wasLiked ? c - 1 : c + 1));
    Animated.sequence([
      Animated.timing(heartScale, {toValue: 1.6, duration: 100, useNativeDriver: true}),
      Animated.spring(heartScale, {toValue: 1, friction: 3, useNativeDriver: true}),
    ]).start();
  };

  const spin = discSpin.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
  const bottomPad = insets.bottom + TAB_BAR_H + 16;

  const bgGradientColors: string[] = post.runningStats
    ? ['#061410', '#0C2218', '#081A12']
    : ['#0E1020', '#0A1810', '#101820'];

  return (
    <View style={[st.container, {width, height}]}>
      {/* Background: image or gradient */}
      {post.image ? (
        <ImageBackground
          source={{uri: post.image}}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={bgGradientColors}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Running stats full-screen card */}
      {post.runningStats && <RunningStatsPanel stats={post.runningStats} />}

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']}
        locations={[0.3, 0.62, 1]}
        style={[st.gradient, {paddingBottom: bottomPad}]}>

        <View style={st.bottomLeft}>
          {/* Author row */}
          <View style={st.userRow}>
            <ImageBackground
              source={{uri: post.author.profileImage}}
              style={st.avatar}
              imageStyle={st.avatarImg}>
              <View style={st.avatarRing} />
            </ImageBackground>
            <Text style={st.username}>@{post.author.username}</Text>
            <TouchableOpacity
              style={[st.followBtn, followed && st.followBtnActive]}
              onPress={() => setFollowed(prev => !prev)}
              activeOpacity={0.8}>
              <Text style={[st.followText, followed && st.followTextActive]}>
                {followed ? '팔로잉' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Caption */}
          <TouchableOpacity onPress={onPressDetail} activeOpacity={0.85}>
            <Text style={st.caption} numberOfLines={2}>{post.caption}</Text>
            <Text style={st.hashtags} numberOfLines={1}>{post.hashtags.join(' ')}</Text>
          </TouchableOpacity>

          {/* Music */}
          <View style={st.musicRow}>
            <Animated.Text style={[st.musicDisc, {transform: [{rotate: spin}]}]}>
              💿
            </Animated.Text>
            <Text style={st.musicTitle} numberOfLines={1}>{post.audioTitle}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Right-side action buttons */}
      <View style={[st.rightActions, {bottom: bottomPad + 120}]}>
        <TouchableOpacity style={st.actionItem} onPress={handleLike} activeOpacity={0.8}>
          <Animated.Text style={[st.actionIcon, {transform: [{scale: heartScale}]}]}>
            {liked ? '❤️' : '🤍'}
          </Animated.Text>
          <Text style={st.actionLabel}>{fmtCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.actionItem} onPress={onPressDetail} activeOpacity={0.8}>
          <Text style={st.actionIcon}>💬</Text>
          <Text style={st.actionLabel}>{fmtCount(post.commentsCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.actionItem} activeOpacity={0.8}>
          <Text style={st.actionIcon}>↗️</Text>
          <Text style={st.actionLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={st.actionItem}
          onPress={() => setSaved(prev => !prev)}
          activeOpacity={0.8}>
          <Text style={st.actionIcon}>{saved ? '🔖' : '📌'}</Text>
          <Text style={st.actionLabel}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.65)',
  textShadowOffset: {width: 0, height: 1},
  textShadowRadius: 4,
};

const st = StyleSheet.create({
  container: {
    backgroundColor: '#071410',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 100,
    justifyContent: 'flex-end',
  },
  bottomLeft: {
    gap: 7,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
  },
  avatarImg: {
    borderRadius: 21,
  },
  avatarRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.85)',
  },
  username: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    ...SHADOW,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  followBtnActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderColor: '#34D399',
  },
  followText: {color: '#fff', fontSize: 12, fontWeight: '700'},
  followTextActive: {color: '#34D399'},

  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    ...SHADOW,
  },
  hashtags: {
    color: 'rgba(52, 211, 153, 0.95)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
    ...SHADOW,
  },

  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  musicDisc: {fontSize: 18},
  musicTitle: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    ...SHADOW,
  },

  rightActions: {
    position: 'absolute',
    right: 14,
    alignItems: 'center',
    gap: 22,
  },
  actionItem: {
    alignItems: 'center',
    gap: 3,
  },
  actionIcon: {
    fontSize: 28,
    ...SHADOW,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    ...SHADOW,
  },
});
