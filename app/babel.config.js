const path = require('node:path');

module.exports = function (api) {
  api.cache(true);
  const expoDir = path.dirname(require.resolve('expo/package.json'));
  return {
    presets: [require.resolve('babel-preset-expo', { paths: [expoDir] })],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
