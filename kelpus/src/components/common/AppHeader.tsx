import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet, StatusBar} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemeContext} from '@theme/ThemeContext';

interface AppHeaderProps {
  title?: string;
}

export const AppHeader = ({title}: AppHeaderProps) => {
  const {isDark, tc, toggleTheme} = useThemeContext();
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <View
        style={[
          s.header,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            backgroundColor: tc.headerBg,
            borderBottomColor: tc.headerBorder,
          },
        ]}>
        <View style={s.left}>
          <Image
            source={require('../../assets/logo.png')}
            style={s.logoImg}
            resizeMode="contain"
          />
          <Text style={[s.logo, {color: tc.emerald}]}>
            {title ?? 'KELPUS'}
          </Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={s.themeBtn} activeOpacity={0.7}>
          <Text style={s.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  left:    {flexDirection: 'row', alignItems: 'center'},
  logoImg: {width: 28, height: 28, borderRadius: 6, marginRight: 8},
  logo:  {
    fontFamily: 'SpaceGrotesk',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 3,
  },
  themeBtn:  {padding: 6},
  themeIcon: {fontSize: 20},
});
