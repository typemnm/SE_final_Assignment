/* global globalThis */
import React from 'react';
import {View} from 'react-native';
import {render, waitFor} from '@testing-library/react-native';

import {RunningMapView} from '../features/running/components/RunningMapView.web';
import {AnimatedRouteMap} from '../features/running/components/AnimatedRouteMap.web';

const installNaver = () => {
  const maps = [];
  const polylines = [];
  const markers = [];
  class LatLng { constructor(lat, lng) { Object.assign(this, {lat, lng}); } }
  class Point { constructor(x, y) { Object.assign(this, {x, y}); } }
  class LatLngBounds { constructor(sw, ne) { Object.assign(this, {sw, ne}); } }
  class Map {
    constructor(node, options) { Object.assign(this, {node, options, fitBounds: jest.fn(), panTo: jest.fn(), destroy: jest.fn()}); maps.push(this); }
  }
  class Polyline {
    constructor(options) { Object.assign(this, {options, setPath: jest.fn(), setMap: jest.fn()}); polylines.push(this); }
  }
  class Marker {
    constructor(options) { Object.assign(this, {options, setPosition: jest.fn(), setMap: jest.fn()}); markers.push(this); }
  }
  globalThis.naver = {maps: {
    LatLng, Point, LatLngBounds, Map, Polyline, Marker,
    MapTypeId: {NORMAL: 'normal'}, Position: {TOP_RIGHT: 'top-right'},
  }};
  return {maps, polylines, markers};
};

const installDomRef = () => {
  const createElement = React.createElement;
  jest.spyOn(React, 'createElement').mockImplementation((type, props, ...children) => {
    if (type === 'div') {
      if (props?.ref && typeof props.ref === 'object') {
        props.ref.current = {nodeType: 1};
      }
      return createElement(View, {...props, ref: undefined}, ...children);
    }
    return createElement(type, props, ...children);
  });
};

afterEach(() => {
  delete globalThis.naver;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('web running map renders its deterministic empty fallback', () => {
  const view = render(<RunningMapView route={[]} />);
  expect(view.getByText('경로 데이터가 없습니다')).toBeTruthy();
});

test('web running map initializes live and historical map layers', async () => {
  installDomRef();
  const naver = installNaver();
  const route = [{latitude: 37.5, longitude: 127}, {latitude: 37.6, longitude: 127.1}];
  const history = render(<RunningMapView route={route} currentPosition={route[0]} />);
  await waitFor(() => expect(naver.maps.length).toBe(1));
  expect(naver.polylines[0].setPath).toHaveBeenCalled();
  history.rerender(<RunningMapView route={[...route, {latitude: 37.7, longitude: 127.2}]} currentPosition={route[0]} />);
  history.unmount();

  const live = render(<RunningMapView route={route} currentPosition={route[0]} isLive />);
  await waitFor(() => expect(naver.maps.length).toBe(2));
  live.rerender(<RunningMapView route={route} currentPosition={route[1]} isLive />);
  await waitFor(() => expect(naver.maps[1].panTo).toHaveBeenCalled());
  live.unmount();
});

test('animated web route map rejects insufficient routes without external effects', () => {
  expect(render(<AnimatedRouteMap route={[]} />).toJSON()).toBeTruthy();
  expect(render(<AnimatedRouteMap route={[{lat: 0, lng: 0}]} />).toJSON()).toBeTruthy();
});

test('animated web route map initializes and completes playback', async () => {
  jest.useFakeTimers();
  installDomRef();
  const naver = installNaver();
  let now = 0;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  const route = [{lat: 37.5, lng: 127}, {latitude: 37.6, longitude: 127.1}, {lat: 37.7, lng: 127.2}];
  const view = render(<AnimatedRouteMap route={route} animationDuration={100} />);
  await waitFor(() => expect(naver.maps.length).toBe(1));
  now = 70;
  await jest.advanceTimersByTimeAsync(32);
  now = 120;
  await jest.advanceTimersByTimeAsync(32);
  expect(naver.polylines.some(line => line.setPath.mock.calls.length > 0)).toBe(true);
  view.unmount();
});
