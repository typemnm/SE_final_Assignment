import {NativeModules, Platform} from 'react-native';

export interface ClipInput {
  uri: string;
  text: string;
}

interface VideoProcessorBridge {
  combineClips(clips: ClipInput[], speedFactor: number): Promise<string>;
  getThumbnail(videoUri: string): Promise<string | null>;
}

const {VideoProcessor} = NativeModules as {VideoProcessor?: VideoProcessorBridge};

export const videoProcessor = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && !!VideoProcessor;
  },

  async combineClips(clips: ClipInput[], speedFactor: number): Promise<string> {
    if (!VideoProcessor) {
      throw new Error('VideoProcessor 네이티브 모듈을 찾을 수 없습니다');
    }
    return VideoProcessor.combineClips(clips, speedFactor);
  },

  async getThumbnail(videoUri: string): Promise<string | null> {
    if (!VideoProcessor) {
      return null;
    }
    try {
      return await VideoProcessor.getThumbnail(videoUri);
    } catch {
      return null;
    }
  },
};
