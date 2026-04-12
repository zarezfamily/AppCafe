# ETIOVE · Refactor paso 2

Este pack separa la parte más importante del `App.js` actual:

- `AuthContext`
- `AppProviders`
- `AppBootstrap`
- `RootNavigator`
- `WelcomeScreen`
- `AuthScreen`
- `MainScreen` placeholder

## Orden recomendado

1. Copia estos ficheros dentro de tu repo.
2. Sustituye el `App.js` actual por el `App.js` de este pack.
3. Comprueba que existen estas rutas en tu proyecto:
   - `src/context/UIContext`
   - `src/navigation/linking`
   - `src/api/profileSync`
   - `src/components/AppDialogModal`
   - `firebaseConfig.js`
4. Pega la implementación real de `MainScreen` dentro de `src/screens/MainScreen.js`.
5. Cuando eso funcione, empieza el paso 2.1: sacar subbloques de `MainScreen` a `/features`.

## Qué resuelve ya

- `App.js` deja de ser el sitio donde viven bootstrap, providers y navegación.
- La autenticación queda en un contexto reutilizable.
- El arranque queda desacoplado.
- El splash de bienvenida y la pantalla de auth salen del archivo gigante.

## Qué NO resuelve aún

- El `MainScreen` real sigue pendiente de moverse completo.
- No se ha tocado todavía `firebaseConfig.js`.
- No se ha dividido todavía la lógica de café, foro, perfil y premium.
