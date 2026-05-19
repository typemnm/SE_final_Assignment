import React from 'react';
import {View, Text, Image, TouchableOpacity, Linking, StyleSheet} from 'react-native';
import type {SnsPost} from '@appTypes/sns.types';
import {colors, typography, spacing} from '@theme/index';
import {formatDate} from '@utils/format';

interface FeedCardProps {
  post: SnsPost;
}

export const FeedCard = ({post}: FeedCardProps) => (
  <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(post.originalUrl)}>
    <Image source={{uri: post.thumbnail}} style={styles.thumbnail} resizeMode="cover" />
    <View style={styles.content}>
      <Text style={styles.author}>@{post.author.username}</Text>
      <Text style={styles.caption} numberOfLines={2}>{post.caption}</Text>
      <Text style={styles.date}>{formatDate(post.postedAt)}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: spacing.md, marginBottom: spacing.md, overflow: 'hidden', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2},
  thumbnail: {width: '100%', height: 200},
  content: {padding: spacing.md},
  author: {...typography.body2, color: colors.primary, fontWeight: '600'},
  caption: {...typography.body2, color: colors.text.primary, marginVertical: spacing.xs},
  date: {...typography.caption, color: colors.text.secondary},
});
