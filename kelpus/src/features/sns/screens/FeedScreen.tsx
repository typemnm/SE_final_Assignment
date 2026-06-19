import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSavedReels} from '../hooks/useSavedReels';
import {useUserPosts, type UserPost} from '../hooks/useUserPosts';
import {FeedThreadCard} from '../components/FeedThreadCard';
import {ReelsViewerModal} from '../components/ReelsViewerModal';
import {ReelCreatorModal, type FeedShareData} from '../components/ReelCreatorModal';
import {VideoRecorderModal} from '../components/VideoRecorderModal';
import {SavedReelListItem} from '../components/SavedReelListItem';
import {SavedReelViewer} from '../components/SavedReelViewer';
import {PostComposerSheet} from '../components/PostComposerSheet';
import {AppHeader} from '@components/common/AppHeader';
import {ThemeBackground} from '@components/common/ThemeBackground';
import {useThemeContext} from '@theme/ThemeContext';
import {MOCK_FEED, type MockFeedPost} from '../data/mockFeedData';
import type {SavedReel} from '../hooks/useSavedReels';

const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'];

const fadeSlide = (a: Animated.Value) => ({
  opacity: a,
  transform: [{translateY: a.interpolate({inputRange: [0, 1], outputRange: [28, 0]})}],
});

// 날짜 키 및 레이블 계산
const dateKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const dateLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  const dow = DOW_KR[d.getDay()];
  if (isToday) return `오늘 (${d.getMonth() + 1}/${d.getDate()} ${dow})`;
  if (isYesterday) return `어제 (${d.getMonth() + 1}/${d.getDate()} ${dow})`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
};

const MY_AVATAR = 'https://i.pravatar.cc/100?img=3';

export const FeedScreen = () => {
  const {tc} = useThemeContext();
  const insets = useSafeAreaInsets();
  const {reels, loadReels} = useSavedReels();
  const {posts: userPosts, loadPosts, createPost, deletePost} = useUserPosts();

  const [reelsViewerVisible, setReelsViewerVisible] = useState(false);
  const [reelsInitialIndex, setReelsInitialIndex]   = useState(0);
  const [reelModalVisible, setReelModal]             = useState(false);
  const [videoModalVisible, setVideoModal]           = useState(false);
  const [viewingReel, setViewingReel]                = useState<SavedReel | null>(null);
  // 기본값 true — 처음부터 펼쳐진 상태
  const [reelsExpanded, setReelsExpanded]            = useState(true);
  // 피드 공유 컴포저
  const [composerVisible, setComposerVisible]        = useState(false);
  const [composerData, setComposerData]              = useState<FeedShareData | null>(null);

  const SA = useRef(Array.from({length: 2}, () => new Animated.Value(0))).current;

  useFocusEffect(
    useCallback(() => {
      SA.forEach(a => a.setValue(0));
      const anim = Animated.stagger(90, SA.map(a =>
        Animated.spring(a, {toValue: 1, tension: 55, friction: 8, useNativeDriver: true}),
      ));
      anim.start();
      loadPosts();
      return () => anim.stop();
    }, [SA, loadPosts]),
  );

  useEffect(() => {
    loadReels();
  }, [loadReels]);

  // 피드 공유 데이터를 받아 PostComposerSheet 열기
  const handleShareToFeed = useCallback((data: FeedShareData) => {
    setComposerData(data);
    setComposerVisible(true);
  }, []);

  // PostComposerSheet에서 "게시" 버튼 탭 시 호출
  const handlePost = useCallback(async (caption: string, hashtags: string[]) => {
    if (!composerData) return;
    await createPost({
      caption,
      hashtags,
      reelId: composerData.reelId,
      runningStats: composerData.runningStats,
      totalCalories: composerData.totalCalories,
    });
    setComposerVisible(false);
    setComposerData(null);
  }, [composerData, createPost]);

  // UserPost → MockFeedPost 변환 (피드 카드 렌더링용)
  const userFeedPosts = useMemo<MockFeedPost[]>(() =>
    userPosts.map(up => ({
      id: up.id,
      author: {username: 'me', displayName: '나', profileImage: MY_AVATAR},
      caption: up.caption,
      hashtags: up.hashtags,
      runningStats: up.runningStats,
      likesCount: 0,
      commentsCount: 0,
      audioTitle: 'KELPUS',
      postedAt: up.createdAt,
    })),
  [userPosts]);

  // 유저 게시물 + 목 피드 합치기 (유저 게시물 상단)
  const allFeedPosts = useMemo<MockFeedPost[]>(
    () => [...userFeedPosts, ...MOCK_FEED],
    [userFeedPosts],
  );

  // 게시물 클릭: 유저 게시물이면 연결된 릴스를 SavedReelViewer로, 아니면 ReelsViewerModal로
  const handleFeedPress = useCallback((postId: string, index: number) => {
    const isUserPost = postId.startsWith('upost_');
    if (isUserPost) {
      const up: UserPost | undefined = userPosts.find(p => p.id === postId);
      if (up?.reelId) {
        const linkedReel = reels.find(r => r.id === up.reelId);
        if (linkedReel) {
          setViewingReel(linkedReel);
          return;
        }
      }
      // reelId 없거나 릴스 못 찾으면 아무것도 안 함
      return;
    }
    // 목 피드 — 유저 게시물 수만큼 오프셋 빼서 올바른 인덱스로
    const mockIndex = index - userFeedPosts.length;
    setReelsInitialIndex(Math.max(0, mockIndex));
    setReelsViewerVisible(true);
  }, [userPosts, reels, userFeedPosts.length]);

  // 날짜 기준 그룹핑
  const reelGroups = useMemo(() => {
    const groups: {key: string; label: string; items: SavedReel[]}[] = [];
    const seen = new Map<string, number>();
    for (const reel of reels) {
      const k = dateKey(reel.createdAt);
      if (!seen.has(k)) {
        seen.set(k, groups.length);
        groups.push({key: k, label: dateLabel(reel.createdAt), items: []});
      }
      groups[seen.get(k)!].items.push(reel);
    }
    return groups;
  }, [reels]);

  // ── 내 릴스 기록 헤더 ──────────────────────────────────────────
  const ListHeader = useMemo(() => (
    <View>
      {/* 내 릴스 섹션 (접기/펼치기) */}
      {reels.length > 0 && (
        <View style={[st.reelsSection, {borderBottomColor: tc.divider}]}>
          <TouchableOpacity
            style={st.reelsSectionHeader}
            onPress={() => setReelsExpanded(e => !e)}
            activeOpacity={0.7}>
            <Text style={st.reelsSectionIcon}>🎬</Text>
            <Text style={[st.reelsSectionTitle, {color: tc.textPri}]}>내 릴스 기록</Text>
            <Text style={[st.reelsSectionCount, {color: tc.textSec}]}>{reels.length}개</Text>
            <Text style={[st.expandIcon, {color: tc.textSec}]}>{reelsExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {reelsExpanded && (
            <View style={st.groupsWrap}>
              {reelGroups.map(group => (
                <View key={group.key}>
                  {/* 날짜 섹션 헤더 */}
                  <View style={st.dateBadgeRow}>
                    <View style={[st.dateBadge, {backgroundColor: `${tc.emerald}1A`, borderColor: `${tc.emerald}30`}]}>
                      <Text style={[st.dateBadgeText, {color: tc.emerald}]}>
                        {group.label}
                      </Text>
                    </View>
                    <View style={[st.dateLine, {backgroundColor: tc.divider}]} />
                  </View>

                  {group.items.map(reel => (
                    <SavedReelListItem
                      key={reel.id}
                      reel={reel}
                      onPress={() => setViewingReel(reel)}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 피드 구분선 */}
      <View style={[st.feedDivider, {borderBottomColor: tc.divider}]}>
        <View style={[st.dividerLine, {backgroundColor: tc.divider}]} />
        <Text style={[st.dividerLabel, {color: tc.textDis}]}>#kelpus 추천 게시물</Text>
        <View style={[st.dividerLine, {backgroundColor: tc.divider}]} />
      </View>
    </View>
  ), [reels, reelGroups, reelsExpanded, tc]);

  return (
    <ThemeBackground style={st.root}>
      <AppHeader />

      {/* ── Thread feed ─────────────────────────────────────────── */}
      <Animated.View style={[{flex: 1}, fadeSlide(SA[0])]}>
        <FlatList
          data={allFeedPosts}
          keyExtractor={item => item.id}
          extraData={userPosts.length}
          ListHeaderComponent={ListHeader}
          renderItem={({item, index}) => (
            <FeedThreadCard
              post={item}
              onPress={() => handleFeedPress(item.id, index)}
              onDelete={item.id.startsWith('upost_') ? () => deletePost(item.id) : undefined}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[st.listContent, {paddingBottom: insets.bottom + 110}]}
        />
      </Animated.View>

      {/* ── FAB 영역: 릴스 만들기 + 영상 편집 ─────────────────────── */}
      <Animated.View
        style={[st.fabWrap, {bottom: insets.bottom + 16}, fadeSlide(SA[1])]}
        pointerEvents="box-none">
        {/* 영상 편집 FAB */}
        <View style={st.fabItem}>
          <TouchableOpacity
            style={[st.fab, st.fabVideo, {shadowColor: tc.emerald}]}
            onPress={() => setVideoModal(true)}
            activeOpacity={0.85}>
            <Text style={st.fabIcon}>🎬</Text>
          </TouchableOpacity>
          <Text style={[st.fabLabel, {color: tc.textDis}]}>영상 편집</Text>
        </View>
        {/* 릴스 만들기 FAB */}
        <View style={st.fabItem}>
          <TouchableOpacity
            style={[st.fab, {backgroundColor: tc.teal, shadowColor: tc.emerald}]}
            onPress={() => setReelModal(true)}
            activeOpacity={0.85}>
            <Text style={st.fabIcon}>+</Text>
          </TouchableOpacity>
          <Text style={[st.fabLabel, {color: tc.textDis}]}>릴스 만들기</Text>
        </View>
      </Animated.View>

      {/* ── Reels fullscreen viewer ───────────────────────────────── */}
      <ReelsViewerModal
        visible={reelsViewerVisible}
        initialIndex={reelsInitialIndex}
        onClose={() => setReelsViewerVisible(false)}
      />

      {/* ── Existing modals ───────────────────────────────────────── */}
      {reelModalVisible && (
        <ReelCreatorModal
          onClose={() => {
            setReelModal(false);
            loadReels();
          }}
          onShareToFeed={handleShareToFeed}
        />
      )}
      {viewingReel && (
        <SavedReelViewer
          reel={viewingReel}
          onClose={() => setViewingReel(null)}
          onShareToFeed={handleShareToFeed}
        />
      )}
      {videoModalVisible && (
        <VideoRecorderModal onClose={() => setVideoModal(false)} />
      )}
      <PostComposerSheet
        visible={composerVisible}
        initialCaption={composerData?.caption ?? ''}
        initialHashtags={composerData?.hashtags}
        runningStats={composerData?.runningStats}
        totalCalories={composerData?.totalCalories}
        onClose={() => {setComposerVisible(false); setComposerData(null);}}
        onPost={handlePost}
      />
    </ThemeBackground>
  );
};

const st = StyleSheet.create({
  root: {flex: 1},
  listContent: {},

  /* 내 릴스 섹션 */
  reelsSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  reelsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  reelsSectionIcon: {fontSize: 16},
  reelsSectionTitle: {flex: 1, fontSize: 15, fontWeight: '700'},
  reelsSectionCount: {fontSize: 12},
  expandIcon: {fontSize: 11},

  /* 날짜 그룹 */
  groupsWrap: {marginTop: 4},
  dateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 6,
    gap: 8,
  },
  dateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dateBadgeText: {fontSize: 12, fontWeight: '700'},
  dateLine: {flex: 1, height: 1},

  /* Divider */
  feedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  dividerLine: {flex: 1, height: 1},
  dividerLabel: {fontSize: 12, fontWeight: '600'},

  /* FAB — 가운데 고정 (가로 배치) */
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 20,
  },
  fabItem: {
    alignItems: 'center',
    gap: 4,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  fabVideo: {
    backgroundColor: '#7C3AED',
  },
  fabIcon: {fontSize: 26, color: '#fff', lineHeight: 32},
  fabLabel: {fontSize: 10, fontWeight: '600'},
});
