import React, {useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import {useRunning} from '../hooks/useRunning';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {colors, typography, spacing} from '@theme/index';
import {fmtKm, difficultyColor} from '../utils';
import type {RunningCourse} from '../types';

const StarRating = ({rating}: {rating: number}) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <Text style={styles.stars}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(5 - full - (half ? 1 : 0))}
      {` ${rating.toFixed(1)}`}
    </Text>
  );
};

const CourseCard = ({course}: {course: RunningCourse}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.courseName}>{course.name}</Text>
      <View style={[styles.diffBadge, {backgroundColor: difficultyColor(course.difficulty)}]}>
        <Text style={styles.diffText}>{course.difficulty}</Text>
      </View>
    </View>

    <View style={styles.metaRow}>
      <Text style={styles.metaItem}>📍 {course.location}</Text>
    </View>
    <View style={styles.metaRow}>
      <Text style={styles.metaItem}>🏃 {fmtKm(course.distance)}</Text>
      <Text style={styles.metaDot}>·</Text>
      <Text style={styles.metaItem}>⏱ 약 {course.estimatedTime}분</Text>
    </View>

    <Text style={styles.description}>{course.description}</Text>
    <StarRating rating={course.rating} />
  </View>
);

export const RunningCoursesScreen = () => {
  const {courses, coursesLoading, fetchCourses} = useRunning();

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  if (coursesLoading) return <LoadingSpinner fullScreen />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={courses}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            지역 러닝 커뮤니티가 추천하는 인기 코스를 달려보세요.
          </Text>
        </View>
      }
      renderItem={({item}) => <CourseCard course={item} />}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>추천 코스를 불러오는 중...</Text>
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {paddingBottom: spacing.xl},
  header: {padding: spacing.md, paddingBottom: 0},
  subtitle: {...typography.body2, color: colors.text.secondary},
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  courseName: {...typography.h3, color: colors.text.primary, flex: 1, marginRight: spacing.sm},
  diffBadge: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  diffText: {...typography.caption, color: '#fff', fontWeight: '700'},
  metaRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 2},
  metaItem: {...typography.body2, color: colors.text.secondary},
  metaDot: {marginHorizontal: spacing.xs, color: colors.text.disabled},
  description: {
    ...typography.body2,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  stars: {fontSize: 14, color: '#FF9800'},
  separator: {height: spacing.sm},
  emptyWrap: {alignItems: 'center', paddingTop: spacing.xxl},
  emptyText: {...typography.body1, color: colors.text.disabled},
});
