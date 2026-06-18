const mockClient = {
  interceptors: {
    request: {use: jest.fn()},
    response: {use: jest.fn()},
  },
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockClient),
    post: jest.fn(),
  },
}));

jest.mock('@utils/tokenStorage', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  updateAccessToken: jest.fn(),
  clearTokens: jest.fn(),
}));

describe('API client build configuration', () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  afterEach(() => {
    process.env.API_BASE_URL = originalApiBaseUrl;
    jest.resetModules();
  });

  it('uses and normalizes API_BASE_URL supplied by the build environment', () => {
    process.env.API_BASE_URL = 'https://kelpusapi.duckdns.org/';
    jest.resetModules();

    // Module initialization creates the configured singleton client.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const axios = require('axios').default;
    require('../client');

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({baseURL: 'https://kelpusapi.duckdns.org'}),
    );
  });
});
