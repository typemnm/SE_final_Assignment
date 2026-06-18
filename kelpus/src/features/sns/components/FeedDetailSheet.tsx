import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemeContext} from '@theme/ThemeContext';
import type {MockFeedPost} from '../data/mockFeedData';
import {MOCK_COMMENTS} from '../data/mockFeedData';

const {height: SCREEN_H} = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.72;

const fmtTime = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

interface Props {
  post: MockFeedPost | null;
  onClose: () => void;
}

export const FeedDetailSheet = ({post, onClose}: Props) => {
  const {tc} = useThemeContext();
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(SHEET_H)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (post) {
      Animated.parallel([
        Animated.spring(slideY, {toValue: 0, tension: 65, friction: 11, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 1, duration: 200, useNativeDriver: true}),
      ]).start();
    } else {
      slideY.setValue(SHEET_H);
      opacity.setValue(0);
    }
  }, [post, slideY, opacity]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideY, {toValue: SHEET_H, duration: 260, useNativeDriver: true}),
      Animated.timing(opacity, {toValue: 0, duration: 200, useNativeDriver: true}),
    ]).start(() => onClose());
  };

  if (!post) return null;

  return (
    <Modal transparent visible={!!post} onRequestClose={handleClose} animationType="none">
      {/* Backdrop */}
      <Animated.View style={[st.backdrop, {opacity}]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          st.sheet,
          {
            backgroundColor: tc.card,
            paddingBottom: insets.bottom + 16,
            transform: [{translateY: slideY}],
          },
        ]}>
        {/* Drag handle */}
        <View style={[st.handle, {backgroundColor: tc.divider}]} />

        {/* Author header */}
        <View style={[st.authorRow, {borderBottomColor: tc.divider}]}>
          <ImageBackground
            source={{uri: post.author.profileImage}}
            style={st.avatar}
            imageStyle={st.avatarImg}
          />
          <View style={st.authorInfo}>
            <Text style={[st.authorName, {color: tc.textPri}]}>@{post.author.username}</Text>
            <Text style={[st.postTime, {color: tc.textSec}]}>{fmtTime(post.postedAt)}</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={st.closeBtn} activeOpacity={0.7}>
            <Text style={[st.closeBtnText, {color: tc.textDis}]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={st.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.scrollContent}>

          {/* Full caption */}
          <Text style={[st.caption, {color: tc.textPri}]}>{post.caption}</Text>
          <Text style={[st.hashtags, {color: tc.emerald}]}>{post.hashtags.join('  ')}</Text>

          {/* Stats row */}
          <View style={[st.statsRow, {borderTopColor: tc.divider, borderBottomColor: tc.divider}]}>
            <View style={st.statItem}>
              <Text style={[st.statNum, {color: tc.textPri}]}>
                {post.likesCount.toLocaleString()}
              </Text>
              <Text style={[st.statLabel, {color: tc.textSec}]}>좋아요</Text>
            </View>
            <View style={[st.statDivider, {backgroundColor: tc.divider}]} />
            <View style={st.statItem}>
              <Text style={[st.statNum, {color: tc.textPri}]}>
                {post.commentsCount.toLocaleString()}
              </Text>
              <Text style={[st.statLabel, {color: tc.textSec}]}>댓글</Text>
            </View>
            <View style={[st.statDivider, {backgroundColor: tc.divider}]} />
            <View style={st.statItem}>
              <Text style={[st.statNum, {color: tc.emerald}]}>🎵</Text>
              <Text style={[st.statLabel, {color: tc.textSec}]} numberOfLines={1}>
                {post.audioTitle.split(' - ')[0]}
              </Text>
            </View>
          </View>

          {/* Comments section */}
          <Text style={[st.commentsHeader, {color: tc.textSec}]}>
            댓글 {post.commentsCount.toLocaleString()}개
          </Text>

          {MOCK_COMMENTS.map(c => (
            <View key={c.id} style={[st.commentItem, {borderBottomColor: tc.divider}]}>
              <ImageBackground
                source={{uri: c.avatar}}
                style={st.commentAvatar}
                imageStyle={st.commentAvatarImg}
              />
              <View style={st.commentBody}>
                <Text style={[st.commentUsername, {color: tc.emerald}]}>@{c.username}</Text>
                <Text style={[st.commentText, {color: tc.textPri}]}>{c.text}</Text>
              </View>
              <View style={st.commentRight}>
                <Text style={st.commentHeart}>🤍</Text>
                <Text style={[st.commentLikes, {color: tc.textDis}]}>{c.likes}</Text>
              </View>
            </View>
          ))}

          {/* Placeholder for more comments */}
          <TouchableOpacity style={st.moreComments} activeOpacity={0.7}>
            <Text style={[st.moreCommentsText, {color: tc.textDis}]}>
              댓글 더 보기 ({post.commentsCount - MOCK_COMMENTS.length}개) ›
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Comment input area */}
        <View style={[st.inputRow, {borderTopColor: tc.divider}]}>
          <View style={[st.inputBox, {backgroundColor: tc.inputBg, borderColor: tc.inputBorder}]}>
            <Text style={[st.inputPlaceholder, {color: tc.textDis}]}>댓글 달기...</Text>
          </View>
          <TouchableOpacity style={[st.sendBtn, {backgroundColor: tc.teal}]} activeOpacity={0.8}>
            <Text style={st.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  /* Author */
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: {width: 40, height: 40},
  avatarImg: {borderRadius: 20},
  authorInfo: {flex: 1},
  authorName: {fontSize: 14, fontWeight: '700'},
  postTime: {fontSize: 12, marginTop: 1},
  closeBtn: {padding: 6},
  closeBtnText: {fontSize: 18, fontWeight: '300'},

  /* Scroll content */
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 18, paddingBottom: 16},
  caption: {fontSize: 15, lineHeight: 22, marginTop: 16},
  hashtags: {fontSize: 13, fontWeight: '600', marginTop: 8, lineHeight: 20},

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 16,
    paddingVertical: 14,
  },
  statItem: {flex: 1, alignItems: 'center', gap: 2},
  statNum: {fontSize: 16, fontWeight: '700'},
  statLabel: {fontSize: 11},
  statDivider: {width: 1, height: 28},

  /* Comments */
  commentsHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  commentAvatar: {width: 32, height: 32},
  commentAvatarImg: {borderRadius: 16},
  commentBody: {flex: 1, gap: 3},
  commentUsername: {fontSize: 12, fontWeight: '700'},
  commentText: {fontSize: 13, lineHeight: 18},
  commentRight: {alignItems: 'center', gap: 2, paddingTop: 2},
  commentHeart: {fontSize: 14},
  commentLikes: {fontSize: 10},

  moreComments: {paddingVertical: 14, alignItems: 'center'},
  moreCommentsText: {fontSize: 13},

  /* Comment input */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  inputBox: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  inputPlaceholder: {fontSize: 14},
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {color: '#fff', fontSize: 18, fontWeight: '700'},
});
