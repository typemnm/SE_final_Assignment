import {dietReducer, requestAnalysisThunk} from './dietSlice';
import {dietApi} from '@api/diet.api';

jest.mock('@api/diet.api', () => ({
  dietApi: {
    requestAnalysis: jest.fn(),
    updateHealthConnectExportStatus: jest.fn(),
  },
}));

const analysis = {
  analysis_id: 'analysis-1',
  record_id: 'diet-record-1',
  total_calories: 640,
  carb_ratio: 50,
  protein_ratio: 25,
  fat_ratio: 25,
  ai_comment: 'ok',
  analyzed_at: '2026-06-11T01:10:00.123Z',
};

describe('dietSlice analysis reducer boundaries', () => {
  beforeEach(() => {
    dietApi.updateHealthConnectExportStatus.mockReset();
  });

  it('keeps Health Connect export orchestration out of reducer fulfillment', () => {
    const state = dietReducer(
      undefined,
      requestAnalysisThunk.fulfilled(analysis, 'request-1', {
        dietImageUrl: 'https://example.com/meal.jpg',
      }),
    );

    expect(state.currentAnalysis).toEqual(analysis);
    expect(state.analysisHistory).toEqual([analysis]);
    expect(dietApi.updateHealthConnectExportStatus).not.toHaveBeenCalled();
  });
});
