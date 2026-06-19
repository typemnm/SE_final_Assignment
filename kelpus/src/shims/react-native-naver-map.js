import React from 'react';
import {View} from 'react-native';

const NaverMapView = React.forwardRef(({style, children}, _ref) =>
  React.createElement(View, {style}, children),
);
NaverMapView.displayName = 'NaverMapViewShim';

const NaverMapMarkerOverlay = () => null;
const NaverMapPathOverlay = () => null;
const NaverMapPolylineOverlay = () => null;
const NaverMapCircleOverlay = () => null;
const NaverMapPolygonOverlay = () => null;
const NaverMapArrowheadPathOverlay = () => null;
const NaverMapMultiPathOverlay = () => null;
const NaverMapGroundOverlay = () => null;
const useInfoWindow = () => ({openWith: () => {}, close: () => {}});

export {
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  NaverMapPolylineOverlay,
  NaverMapCircleOverlay,
  NaverMapPolygonOverlay,
  NaverMapArrowheadPathOverlay,
  NaverMapMultiPathOverlay,
  NaverMapGroundOverlay,
  useInfoWindow,
};
export default NaverMapView;
