import {useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {requestAnalysisThunk} from '../store/dietSlice';
import {dietApi} from '@api/diet.api';
import {captureDietImageFormData, DietCameraError} from '../services/dietCamera.service';

export const getDietCaptureFlowErrorMessage = (err: unknown) => {
  if (err instanceof DietCameraError) {
    return err.message;
  }

  if (typeof err === 'string') {
    return err;
  }

  if ((err as {response?: {status?: number}}).response?.status === 402) {
    return '일일 AI 분석 한도를 초과했습니다. 내일 다시 시도하세요.';
  }

  return '사진 업로드 또는 AI 분석 요청에 실패했습니다.';
};

export const useDiet = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {records, currentAnalysis, analysisHistory, analyzing, error} = useSelector(
    (state: RootState) => state.diet,
  );
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraFlowInFlightRef = useRef(false);

  const requestAnalysis = async (dietImageUrl: string, recordId?: string) => {
    return await dispatch(requestAnalysisThunk({dietImageUrl, recordId})).unwrap();
  };

  const analyzeCapturedImage = async () => {
    if (cameraFlowInFlightRef.current) {
      return null;
    }

    cameraFlowInFlightRef.current = true;
    setCameraError(null);
    setCameraBusy(true);

    try {
      const formData = await captureDietImageFormData();

      if (!formData) {
        return null;
      }

      const uploadResult = await dietApi.uploadDietImage(formData);
      return await requestAnalysis(uploadResult.diet_image_url);
    } catch (err: unknown) {
      setCameraError(getDietCaptureFlowErrorMessage(err));
      return null;
    } finally {
      cameraFlowInFlightRef.current = false;
      setCameraBusy(false);
    }
  };

  return {
    records,
    currentAnalysis,
    analysisHistory,
    analyzing,
    error,
    cameraBusy,
    cameraError,
    requestAnalysis,
    analyzeCapturedImage,
  };
};
