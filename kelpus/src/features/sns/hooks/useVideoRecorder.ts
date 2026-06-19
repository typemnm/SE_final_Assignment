import {useState, useCallback} from 'react';
import {Alert, Platform} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {videoProcessor} from '../services/videoProcessor';

export interface VideoClip {
  id: string;
  uri: string;
  text: string;
  thumbnailUri: string | null;
  createdAt: string;
}

const CLIP_DURATION_LIMIT = 5;

export const useVideoRecorder = () => {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [combinedUri, setCombinedUri] = useState<string | null>(null);
  const [speed, setSpeed] = useState(2.0);
  const [step, setStep] = useState<0 | 1>(0);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }
    const cameraResult = await request(PERMISSIONS.ANDROID.CAMERA);
    const audioResult = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
    if (cameraResult !== RESULTS.GRANTED || audioResult !== RESULTS.GRANTED) {
      Alert.alert('권한 필요', '카메라와 마이크 접근 권한이 필요합니다.\n설정에서 권한을 허용해주세요.');
      return false;
    }
    return true;
  }, []);

  const recordClip = useCallback(async () => {
    const granted = await requestPermissions();
    if (!granted) {
      return;
    }

    setRecording(true);
    launchCamera(
      {
        mediaType: 'video',
        durationLimit: CLIP_DURATION_LIMIT,
        videoQuality: 'medium',
        saveToPhotos: false,
      },
      async response => {
        setRecording(false);
        if (response.didCancel || response.errorCode || !response.assets?.[0]?.uri) {
          return;
        }
        const asset = response.assets[0];
        const uri = asset.uri!;
        const thumbnailUri = await videoProcessor.getThumbnail(uri);
        const clip: VideoClip = {
          id: `clip_${Date.now()}`,
          uri,
          text: '',
          thumbnailUri,
          createdAt: new Date().toISOString(),
        };
        setClips(prev => [...prev, clip]);
      },
    );
  }, [requestPermissions]);

  const updateClipText = useCallback((id: string, text: string) => {
    setClips(prev => prev.map(c => (c.id === id ? {...c, text} : c)));
  }, []);

  const removeClip = useCallback((id: string) => {
    setClips(prev => prev.filter(c => c.id !== id));
  }, []);

  const combineClips = useCallback(async () => {
    if (clips.length < 2) {
      Alert.alert('영상 부족', '영상을 2개 이상 촬영해야 합쳐집니다.');
      return;
    }
    setProcessing(true);
    try {
      const outputUri = await videoProcessor.combineClips(
        clips.map(c => ({uri: c.uri, text: c.text})),
        speed,
      );
      setCombinedUri(outputUri);
      setStep(1);
    } catch (e: any) {
      Alert.alert('합치기 실패', e?.message ?? '영상 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  }, [clips, speed]);

  const reset = useCallback(() => {
    setClips([]);
    setRecording(false);
    setProcessing(false);
    setCombinedUri(null);
    setSpeed(2.0);
    setStep(0);
  }, []);

  return {
    clips,
    recording,
    processing,
    combinedUri,
    speed,
    setSpeed,
    step,
    recordClip,
    updateClipText,
    removeClip,
    combineClips,
    reset,
  };
};
