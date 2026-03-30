// metro.config.js — Necesario para que Firebase funcione con Hermes
// Añade soporte para archivos .cjs y .mjs que usa Firebase internamente
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'cjs',
  'mjs',
];

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
