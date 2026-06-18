// react-native-config is a native module. Web and Jest receive the values that
// webpack/test runners expose through process.env instead.
const Config = {
  API_BASE_URL: process.env.API_BASE_URL || '',
  APP_ENV: process.env.APP_ENV || '',
};

module.exports = Config;
module.exports.default = Config;
