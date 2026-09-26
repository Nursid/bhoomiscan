const path = require('path');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    path.resolve(__dirname, './scripts/inlineEnvPlugin.js'),
    'react-native-reanimated/plugin',
  ],
};

