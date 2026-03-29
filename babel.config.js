module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Necesario para que react-native-get-random-values funcione
      // correctamente con Firebase y crypto
      '@babel/plugin-transform-export-namespace-from',
    ],
  };
};
