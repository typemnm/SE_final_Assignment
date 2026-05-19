import React, {useEffect} from 'react';
import {View, Text, FlatList, RefreshControl, StyleSheet} from 'react-native';
import {useSns} from '../hooks/useSns';
import {FeedCard} from '../components/FeedCard';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {colors, typography, spacing} from '@theme/index';

export const FeedScreen = () => {
  const {posts, loading, refreshing, loadFeed, refreshFeed} = useSns();

  useEffect(() => { loadFeed(1); }, []);

  if (loading && posts.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>#kelpus 피드</Text>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({item}) => <FeedCard post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshFeed} tintColor={colors.primary} />}
        onEndReached={() => loadFeed(2)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={<Text style={styles.empty}>게시물이 없습니다.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  title: {...typography.h2, color: colors.text.primary, padding: spacing.md},
  empty: {...typography.body1, color: colors.text.disabled, textAlign: 'center', marginTop: spacing.xl},
});
