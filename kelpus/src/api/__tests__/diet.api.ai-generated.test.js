import {dietApi} from '../diet.api';
import {apiClient} from '../index';

jest.mock('../index', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('dietApi AI-generated regression tests', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it('requests URL-based AI analysis through the backend analyze contract and unwraps envelopes', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          id: 'analysis-1',
          total_calories: 512,
          carb_ratio: 45,
          protein_ratio: 25,
          fat_ratio: 30,
        },
      },
    });

    await expect(
      dietApi.requestAnalysis({
        image_url: 'https://cdn.example.com/meals/kimchi-stew.jpg',
        diet_record_id: 'diet-record-1',
      }),
    ).resolves.toMatchObject({
      id: 'analysis-1',
      total_calories: 512,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/diet/analyze', {
      image_url: 'https://cdn.example.com/meals/kimchi-stew.jpg',
      diet_record_id: 'diet-record-1',
    });
  });

  it('keeps legacy non-envelope analysis responses compatible', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        id: 'legacy-analysis-1',
        total_calories: 390,
      },
    });

    await expect(dietApi.requestAnalysis({image_url: 'https://cdn.example.com/meal.jpg'})).resolves
      .toMatchObject({
        id: 'legacy-analysis-1',
        total_calories: 390,
      });
  });

  it('reads analysis history and quota endpoints without mutating backend paths', async () => {
    apiClient.get.mockResolvedValueOnce({data: []});
    apiClient.get.mockResolvedValueOnce({data: {remaining: 2, total: 3}});

    await expect(dietApi.getAnalysisHistory()).resolves.toEqual({data: []});
    await expect(dietApi.getAnalysisCount()).resolves.toEqual({data: {remaining: 2, total: 3}});

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/diet/history');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/diet/count');
  });
});
