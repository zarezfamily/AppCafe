const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Esto soluciona el error de la 'S' al manejar correctamente los módulos de Firebase
config.resolver.sourceExts.push('mjs');

module.exports = config;