import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {SavedReel} from '../hooks/useSavedReels';
import type {DietFrame, RunningFrame} from '../hooks/useReelCreator';

interface Props {
  reel: SavedReel;
  onPress: () => void;
}

export const SavedReelCard = ({reel, onPress}: Props) => {
  const first = reel.frames[0];
  const isDiet = first?.type === 'diet';

  const bgColor = isDiet ? '#0F2010' : '#0F1825';
  const accent = isDiet ? '#81C784' : '#64B5F6';
  const icon = isDiet ? '🍽️' : '🏃';

  let mainLine = '';
  let subLine = '';
  if (first) {
    if (isDiet) {
      mainLine = (first as DietFrame).totalCalories.toLocaleString();
      subLine = 'kcal';
    } else {
      const km = (first as RunningFrame).distanceKm;
      mainLine = km >= 1 ? km.toFixed(2) : `${Math.round(km * 1000)}`;
      subLine = km >= 1 ? 'km' : 'm';
    }
  }

  const d = new Date(reel.createdAt);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.card, {backgroundColor: bgColor, borderColor: `${accent}35`}]}>
        <View style={styles.top}>
          <Text style={styles.icon}>{icon}</Text>
          {reel.frames.length > 1 && (
            <View style={[styles.badge, {borderColor: accent}]}>
              <Text style={[styles.badgeTxt, {color: accent}]}>
                {reel.frames.length}
              </Text>
            </View>
          )}
        </View>
        <View>
          <Text style={[styles.mainLine, {color: accent}]}>{mainLine}</Text>
          <Text style={[styles.subLine, {color: `${accent}99`}]}>{subLine}</Text>
        </View>
        <Text style={styles.date}>{dateStr}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 88,
    height: 140,
    borderRadius: 14,
    padding: 10,
    marginRight: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  icon: {fontSize: 18},
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeTxt: {fontSize: 9, fontWeight: '700'},
  mainLine: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    includeFontPadding: false,
  },
  subLine: {fontSize: 10, fontWeight: '600'},
  date: {fontSize: 10, color: 'rgba(255,255,255,0.35)'},
});
