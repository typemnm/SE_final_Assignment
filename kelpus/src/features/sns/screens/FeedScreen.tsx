import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useSns} from '../hooks/useSns';
import {useSavedReels} from '../hooks/useSavedReels';
import {FeedCard} from '../components/FeedCard';
import {ReelCreatorModal} from '../components/ReelCreatorModal';
import {SavedReelListItem} from '../components/SavedReelListItem';
import {SavedReelViewer} from '../components/SavedReelViewer';
import {colors, typography, spacing} from '@theme/index';
import type {SavedReel} from '../hooks/useSavedReels';

// ── 월별 그룹 헬퍼 ────────────────────────────────

interface ReelGroup {
  key: string;
  label: string;
  items: SavedReel[];
}

const groupByMonth = (reels: SavedReel[]): ReelGroup[] => {
  const map = new Map<string, SavedReel[]>();
  reels.forEach(reel => {
    const d = new Date(reel.createdAt);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(reel);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([k, items]) => {
      const d = new Date(items[0].createdAt);
      return {
        key: k,
        label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
        items,
      };
    });
};

// ── 컴포넌트 ─────────────────────────────────────

export const FeedScreen = () => {
  const {posts, loading, refreshing, loadFeed, refreshFeed} = useSns();
  const {reels, loadReels} = useSavedReels();
  const [reelModalVisible, setReelModalVisible] = useState(false);
  const [viewingReel, setViewingReel] = useState<SavedReel | null>(null);
  const [reelsExpanded, setReelsExpanded] = useState(true);

  useEffect(() => {
    loadFeed(1);
    loadReels();
  }, [loadFeed, loadReels]);

  const handleModalClose = () => {
    setReelModalVisible(false);
    loadReels();
  };

  const groups = useMemo(() => groupByMonth(reels), [reels]);

  // 내 릴스 섹션 (FlatList ListHeaderComponent로 삽입)
  const ListHeader = useMemo(() => {
    if (groups.length === 0) return null;
    return (
      <View style={styles.reelsSection}>
        <TouchableOpacity
          style={styles.reelsSectionHeader}
          onPress={() => setReelsExpanded(e => !e)}
          activeOpacity={0.7}>
          <Text style={styles.reelsSectionTitle}>내 릴스 기록</Text>
          <Text style={styles.reelsSectionCount}>{reels.length}개</Text>
          <Text style={styles.expandIcon}>{reelsExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {reelsExpanded &&
          groups.map(group => (
            <View key={group.key}>
              <Text style={styles.monthHeader}>{group.label}</Text>
              {group.items.map(reel => (
                <SavedReelListItem
                  key={reel.id}
                  reel={reel}
                  onPress={() => setViewingReel(reel)}
                />
              ))}
            </View>
          ))}

        <View style={styles.feedDivider}>
          <View style={styles.feedDividerLine} />
          <Text style={styles.feedDividerLabel}>#kelpus 피드</Text>
          <View style={styles.feedDividerLine} />
        </View>
      </View>
    );
  }, [groups, reels.length, reelsExpanded]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>#kelpus 피드</Text>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({item}) => <FeedCard post={item} />}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshFeed}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (posts.length > 0 && !loading) loadFeed(2);
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.spinner}
            />
          ) : (
            <Text style={styles.empty}>게시물이 없습니다.</Text>
          )
        }
      />

      {/* 릴스 생성 FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setReelModalVisible(true)}
        activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {reelModalVisible && (
        <ReelCreatorModal onClose={handleModalClose} />
      )}

      {viewingReel && (
        <SavedReelViewer
          reel={viewingReel}
          onClose={() => setViewingReel(null)}
        />
      )}
    </View>
  );
};

// ── 스타일 ────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  title: {...typography.h2, color: colors.text.primary, padding: spacing.md},

  // 내 릴스 섹션
  reelsSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  reelsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  reelsSectionTitle: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  reelsSectionCount: {
    ...typography.caption,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  expandIcon: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  monthHeader: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
  feedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  feedDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  feedDividerLabel: {
    ...typography.caption,
    color: colors.text.disabled,
  },

  // 피드
  spinner: {marginTop: spacing.xl},
  empty: {
    ...typography.body1,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 34,
    fontWeight: '300',
  },
});
