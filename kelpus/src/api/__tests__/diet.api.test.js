import {dietApi} from '../diet.api';
import {apiClient} from '../index';

jest.mock('../index', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('dietApi', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
  });

  it('uploads diet images as multipart form data to the backend file field contract', async () => {
    const formData = new FormData();
    formData.append('file', {uri: 'file:///meal.jpg', name: 'meal.jpg', type: 'image/jpeg'});
    apiClient.post.mockResolvedValue({
      data: {data: {diet_image_url: '/static/diet_uploads/meal.jpg', message: 'ok'}},
    });

    await expect(dietApi.uploadDietImage(formData)).resolves.toEqual({
      diet_image_url: '/static/diet_uploads/meal.jpg',
      message: 'ok',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/diet/upload', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
  });
});
