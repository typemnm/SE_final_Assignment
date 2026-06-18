/**
 * Web shim for react-native-linear-gradient.
 * Uses CSS linear-gradient via inline background style (react-native-web passes CSS through).
 */
import React from 'react';
import {View} from 'react-native';

const LinearGradient = ({colors = [], start, end, style, children, ...rest}) => {
  let direction = 'to bottom';
  if (start && end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
    direction = `${angle}deg`;
  }

  const gradient = `linear-gradient(${direction}, ${colors.join(', ')})`;

  return (
    <View style={[style, {background: gradient}]} {...rest}>
      {children}
    </View>
  );
};

export default LinearGradient;
