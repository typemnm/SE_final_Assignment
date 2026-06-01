import React from 'react';

const MapView = ({ style, children }) =>
  React.createElement(
    'div',
    {
      style: {
        backgroundColor: '#e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
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
