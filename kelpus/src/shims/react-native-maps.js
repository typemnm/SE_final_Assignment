import React from 'react';

// React Native style arrays/numbers must be flattened before spreading into DOM style
const flattenStyle = (style) => {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  if (typeof style === 'number') return {}; // StyleSheet ID — skip on web
  return style;
};

const MapView = ({ style, children }) =>
  React.createElement(
    'div',
    {
      style: {
        backgroundColor: '#e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...flattenStyle(style),
      },
    },
    React.createElement('span', { style: { color: '#666', fontSize: 14 } }, '지도 (웹 미지원)')
  );

MapView.displayName = 'MapViewShim';

const Marker = () => null;
const Polyline = () => null;
const Circle = () => null;
const Callout = ({ children }) => children || null;
const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

export { Marker, Polyline, Circle, Callout, PROVIDER_GOOGLE, PROVIDER_DEFAULT };
export default MapView;
