cat <<EOF > metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Esta línea permite que Metro lea correctamente los módulos (.mjs) de Firebase
config.resolver.sourceExts.push('mjs');

module.exports = config;
EOF