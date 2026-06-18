import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  FlatList,
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {ReelsCard} from './ReelsCard';
import {FeedDetailSheet} from './FeedDetailSheet';
import {MOCK_FEED} from '../data/mockFeedData';
import type {MockFeedPost} from '../data/mockFeedData';
import {useThemeContext} from '@theme/ThemeContext';

interface Props {
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
}

export const ReelsViewerModal = ({visible, initialIndex, onClose}: Props) => {
  const {isDark, toggleTheme} = useThemeContext();
  const {height: screenHeight} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [detailPost, setDetailPost] = useState<MockFeedPost | null>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const headerOpacity = useRef(new Animated.Value(0)).current;

  // When modal opens, scroll to the tapped post and fade in header
  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      headerOpacity.setValue(0);
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Scroll to initial index after a short delay (FlatList needs to mount)
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({index: initialIndex, animated: false});
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [visible, initialIndex, headerOpacity]);

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: {index: number | null}[]}) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 50}).current;

  const getItemLayout = (_: unknown, index: number) => ({
    length: screenHeight,
    offset: screenHeight * index,
    index,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={st.root}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* ── Full-screen paginated reel list ─────────────────────── */}
        <FlatList
          ref={listRef}
          data={MOCK_FEED}
          keyExtractor={item => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          renderItem={({item}) => (
            <ReelsCard
              post={item}
              height={screenHeight}
              onPressDetail={() => setDetailPost(item)}
            />
          )}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {/* ── Top gradient for readability ────────────────────────── */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={[st.topGradient, {height: insets.top + 76}]}
          pointerEvents="none"
        />

        {/* ── Overlay header ──────────────────────────────────────── */}
        <Animated.View
          style={[st.header, {paddingTop: insets.top + 12, opacity: headerOpacity}]}
          pointerEvents="box-none">
          {/* Back button */}
          <TouchableOpacity style={st.backBtn} onPress={onClose} activeOpacity={0.8}>
            <View style={st.backBtnBg}>
              <Text style={st.backBtnIcon}>←</Text>
            </View>
          </TouchableOpacity>

          {/* KELPUS logo (center) */}
          <View style={st.logoWrap} pointerEvents="none">
            <Text style={st.leaf}>🌿</Text>
            <Text style={st.logo}>KELPUS</Text>
          </View>

          {/* Theme toggle */}
          <TouchableOpacity style={st.headerBtn} onPress={toggleTheme} activeOpacity={0.8}>
            <Text style={st.headerBtnIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Dot progress indicator ──────────────────────────────── */}
        <View
          style={[st.dots, {top: insets.top + 64}]}
          pointerEvents="none">
          {MOCK_FEED.map((_, i) => (
            <View
              key={i}
              style={[st.dot, i === activeIndex ? st.dotActive : st.dotInactive]}
            />
          ))}
        </View>

        {/* ── Post detail sheet ───────────────────────────────────── */}
        <FeedDetailSheet
          post={detailPost}
          onClose={() => setDetailPost(null)}
        />
      </View>
    </Modal>
  );
};

const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.6)',
  textShadowOffset: {width: 0, height: 1},
  textShadowRadius: 4,
};

const st = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000'},

  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  /* Header */
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {marginRight: 8},
  backBtnBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backBtnIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    ...SHADOW,
  },
  logoWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  leaf: {fontSize: 18, ...SHADOW},
  logo: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
    ...SHADOW,
  },
  headerBtn: {padding: 6, marginLeft: 8},
  headerBtnIcon: {fontSize: 20, ...SHADOW},

  /* Dot indicators */
  dots: {
    position: 'absolute',
    right: 10,
    alignItems: 'center',
    gap: 4,
  },
  dot: {width: 3, borderRadius: 2},
  dotActive: {height: 18, backgroundColor: '#34D399'},
  dotInactive: {height: 6, backgroundColor: 'rgba(255,255,255,0.35)'},
});
