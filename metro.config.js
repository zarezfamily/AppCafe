const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Necesario para que Firebase resuelva correctamente sus módulos .mjs
config.resolver.sourceExts.push('mjs');

// Fuerza a Metro a usar el campo "browser" en lugar de "main"
// para los paquetes de Firebase, evitando el error de 'S' undefined
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'default'];

module.exports = config;
