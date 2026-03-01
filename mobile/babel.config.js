module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@canaloni/shared': '../shared/src/index.ts',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
