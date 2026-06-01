import React from 'react';

const Icon = ({ name, size = 24, color = '#000', style }) =>
  React.createElement(
    'span',
    {
      style: {
        fontSize: size,
        color,
        display: 'inline-block',
        lineHeight: 1,
        ...style,
      },
      'aria-label': name,
    },
    '■'
  );

Icon.getImageSource = async () => null;
Icon.getImageSourceSync = () => null;
Icon.displayName = 'VectorIconShim';

export default Icon;
