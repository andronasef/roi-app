const path = require('node:path');

module.exports = function (api) {
  api.cache(true);
  const expoDir = path.dirname(require.resolve('expo/package.json'));
  const nativewindDir = path.dirname(require.resolve('nativewind/package.json'));
  const cssInteropDir = path.dirname(
    require.resolve('react-native-css-interop/package.json', {
      paths: [nativewindDir],
    }),
  );

  // Under bun's isolated linker, nativewind/babel's string plugin
  // '@babel/plugin-transform-react-jsx' is not hoisted to app/node_modules.
  // babel-preset-expo already configures jsxImportSource ('nativewind') and
  // react-native-worklets/plugin, so we wire css-interop's createElement
  // plugin explicitly while keeping isolated resolution intact.
  return {
    presets: [
      [
        require.resolve('babel-preset-expo', { paths: [expoDir] }),
        { jsxImportSource: 'nativewind' },
      ],
    ],
    plugins: [
      require.resolve('react-native-css-interop/dist/babel-plugin', {
        paths: [cssInteropDir],
      }),
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
