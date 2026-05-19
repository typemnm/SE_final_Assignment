import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store/index';
import {requestAnalysisThunk} from '../store/dietSlice';

export const useDiet = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {records, currentAnalysis, analysisHistory, analyzing, error} = useSelector((state: RootState) => state.diet);

  const requestAnalysis = async (profileId: string, date: string) => {
    await dispatch(requestAnalysisThunk({profileId, date}));
  };

  return {records, currentAnalysis, analysisHistory, analyzing, error, requestAnalysis};
};
