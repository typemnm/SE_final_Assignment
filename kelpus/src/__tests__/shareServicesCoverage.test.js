/* global globalThis */
import {Linking, Platform, Share} from 'react-native';
import {shareService as nativeShareService} from '../features/sns/services/shareService';
import {shareService as webShareService} from '../features/sns/services/shareService.web';

const content = {caption: 'Morning run', hashtags: ['#kelpus', '#run']};

const setPlatform = (os, version = 34) => {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: os});
  Object.defineProperty(Platform, 'Version', {configurable: true, value: version});
};

beforeEach(() => {
  jest.restoreAllMocks();
  setPlatform('android', 34);
});

test('native sharing covers Instagram availability and Android routing', async () => {
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue();
  jest.spyOn(Share, 'share').mockResolvedValue({action: 'sharedAction'});
  expect(await nativeShareService.canOpenInstagram()).toBe(true);
  await nativeShareService.shareToInstagramStories(content);
  await nativeShareService.shareToInstagramFeed(content);
  expect(Linking.openURL).toHaveBeenCalledWith('instagram://app');

  await nativeShareService.shareToInstagramStories({...content, imageDataUrl: 'file://run.jpg'});
  await nativeShareService.shareToInstagramFeed({...content, imageDataUrl: 'file://run.jpg'});
  await nativeShareService.shareNative(content);
  expect(Share.share).toHaveBeenCalled();
});

test('native sharing falls back after link and share failures', async () => {
  jest.spyOn(Linking, 'canOpenURL').mockRejectedValue(new Error('link down'));
  jest.spyOn(Share, 'share').mockRejectedValue(new Error('share down'));
  expect(await nativeShareService.canOpenInstagram()).toBe(false);
  await nativeShareService.shareToInstagramStories({...content, imageDataUrl: 'file://run.jpg'});
  await nativeShareService.shareToInstagramFeed({...content, imageDataUrl: 'file://run.jpg'});
  await nativeShareService.shareNative(content);
});

test('native sharing covers iOS links and save fallback', async () => {
  setPlatform('ios');
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue();
  jest.spyOn(Share, 'share').mockResolvedValue({action: 'sharedAction'});
  await nativeShareService.shareToInstagramStories(content);
  expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('instagram-stories://share'));
  await nativeShareService.shareToInstagramFeed(content);
  await nativeShareService.shareNative({...content, imageDataUrl: 'file://run.jpg'});
  expect(await nativeShareService.saveToDevice('file://run.jpg')).toBe('shared');

  Share.share.mockRejectedValueOnce(new Error('no sheet'));
  expect(await nativeShareService.saveToDevice('file://run.jpg')).toBe('failed');
});

describe('web sharing', () => {
  let originalNavigator;
  let originalWindow;
  let originalDocument;
  let originalFile;
  let originalFetch;

  beforeEach(() => {
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    originalFile = Object.getOwnPropertyDescriptor(globalThis, 'File');
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    const restore = (key, descriptor) => descriptor
      ? Object.defineProperty(globalThis, key, descriptor)
      : delete globalThis[key];
    restore('navigator', originalNavigator);
    restore('window', originalWindow);
    restore('document', originalDocument);
    restore('File', originalFile);
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
  });

  const installBrowser = ({mobile = false, share, canShare, clipboard} = {}) => {
    const open = jest.fn();
    const anchor = {click: jest.fn()};
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {userAgent: mobile ? 'iPhone' : 'Desktop', share, canShare, clipboard},
    });
    Object.defineProperty(globalThis, 'window', {configurable: true, value: {open}});
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: jest.fn(() => anchor),
        body: {appendChild: jest.fn(), removeChild: jest.fn()},
      },
    });
    Object.defineProperty(globalThis, 'File', {
      configurable: true,
      value: class MockFile { constructor(parts, name, options) { Object.assign(this, {parts, name, ...options}); } },
    });
    globalThis.fetch = jest.fn().mockResolvedValue({blob: async () => ({type: 'image/png'})});
    return {open, anchor};
  };

  test('web native share handles files, text, cancellation, and clipboard', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    const clipboard = {writeText: jest.fn().mockResolvedValue(undefined)};
    installBrowser({share, canShare: jest.fn(() => true), clipboard});
    expect(await webShareService.canOpenInstagram()).toBe(true);
    await webShareService.shareNative({...content, imageDataUrl: 'data:image/png;base64,x'});
    expect(share).toHaveBeenCalledWith(expect.objectContaining({files: expect.any(Array)}));
    await webShareService.shareNative(content);

    share.mockRejectedValueOnce({name: 'AbortError'});
    await webShareService.shareNative(content);
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {userAgent: 'Desktop', clipboard}});
    globalThis.alert = jest.fn();
    await webShareService.shareNative(content);
    expect(clipboard.writeText).toHaveBeenCalled();
  });

  test('web Instagram flow shares on mobile and downloads or copies on desktop', async () => {
    jest.useFakeTimers();
    const share = jest.fn().mockResolvedValue(undefined);
    installBrowser({mobile: true, share, canShare: jest.fn(() => true)});
    await webShareService.shareToInstagramStories({...content, imageDataUrl: 'data:image/png;base64,x'});
    expect(share).toHaveBeenCalled();
    await webShareService.shareToInstagramFeed(content);

    const desktop = installBrowser({clipboard: {writeText: jest.fn().mockResolvedValue(undefined)}});
    const pending = webShareService.shareToInstagramStories({...content, imageDataUrl: 'data:image/png;base64,x'});
    await jest.runAllTimersAsync();
    await pending;
    expect(desktop.anchor.click).toHaveBeenCalled();
    expect(desktop.open).toHaveBeenCalledWith('https://www.instagram.com/', '_blank');
    await webShareService.shareToInstagramFeed(content);
    expect(desktop.open).toHaveBeenCalledTimes(2);
  });
});
