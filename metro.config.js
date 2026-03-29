const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Esta línea es la que soluciona el error de la 'S' de Firebase
config.resolver.sourceExts.push('mjs');

module.exports = config;