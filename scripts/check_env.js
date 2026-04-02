/*
  check_env.js
  Valida variables de entorno requeridas para scripts de datos.

  Uso:
    node --env-file=.env scripts/check_env.js <mode>

  Modes:
    seed-auth   -> EXPO_PUBLIC_FIREBASE_PROJECT_ID + FIREBASE_AUTH_TOKEN
    seed-api    -> EXPO_PUBLIC_FIREBASE_PROJECT_ID + EXPO_PUBLIC_FIREBASE_API_KEY
    import-dry  -> EXPO_PUBLIC_FIREBASE_PROJECT_ID + EXPO_PUBLIC_FIREBASE_API_KEY
    import-write-> EXPO_PUBLIC_FIREBASE_PROJECT_ID + EXPO_PUBLIC_FIREBASE_API_KEY + FIREBASE_AUTH_TOKEN
*/

const mode = process.argv[2] || '';

const has = (key) => String(process.env[key] || '').trim().length > 0;

const checks = {
  'seed-auth': ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_AUTH_TOKEN'],
  'seed-api': ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_API_KEY'],
  'import-dry': ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_API_KEY'],
  'import-write': ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_AUTH_TOKEN'],
};

if (!checks[mode]) {
  console.error('[env-check] Modo invalido. Usa: seed-auth | seed-api | import-dry | import-write');
  process.exit(1);
}

const missing = checks[mode].filter((k) => !has(k));
if (missing.length > 0) {
  console.error(`[env-check] Faltan variables para modo "${mode}": ${missing.join(', ')}`);
  console.error('[env-check] Rellena tu .env antes de ejecutar este script.');
  process.exit(1);
}

console.log(`[env-check] OK (${mode})`);
