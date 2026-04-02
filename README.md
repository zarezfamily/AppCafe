# ☕ Etiove

App móvil para registrar, puntuar y gestionar tu colección de cafés. Escanea el código de barras del paquete, añade notas y puntuación, y consulta el ranking global de los cafés más populares.

## ✨ Funcionalidades

- 📷 **Escáner de código de barras** — escanea cualquier paquete de café para iniciar una entrada
- ⭐ **Puntuación de 1 a 5 estrellas**
- 📝 **Notas personales** por cada café
- 📸 **Foto del café** (guardada localmente)
- 🏆 **Ranking global** — los 5 cafés más votados en tiempo real
- 📦 **Mi Bodega** — tu colección personal con opción de eliminar entradas
- 💬 **Comunidad / foro** — hilos, respuestas, imágenes y acciones de autor
- ✉️ **Newsletter** — suscripción desde la pestaña Más guardada en Firestore

## 🛠️ Tecnologías

- [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) ~54
- [Firebase Firestore Lite](https://firebase.google.com/docs/firestore) para la base de datos en la nube
- [expo-camera](https://docs.expo.dev/versions/latest/sdk/camera/) para el escáner
- [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) para las fotos

> **¿Por qué `jsEngine: "jsc"` en app.json?**
> Firebase Firestore Lite tiene incompatibilidades con el motor Hermes de React Native. Usando JSC (JavaScriptCore) se evitan errores de inicialización en producción.

## 🚀 Instalación

### 1. Clona el repositorio

```bash
git clone https://github.com/zarezfamily/Etiove.git
cd Etiove
```

### 2. Instala las dependencias

```bash
npm install
```

### 3. Configura Firebase

Copia el fichero de ejemplo y rellena con tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus datos de Firebase:

```
EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

Puedes encontrar estos valores en la **Consola de Firebase → Configuración del proyecto**.

> ⚠️ **Nunca subas el fichero `.env` a GitHub.** Ya está incluido en `.gitignore`.

### 4. Configura las reglas de seguridad de Firestore

En la consola de Firebase → Firestore → Reglas, usa al menos:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Cambia a autenticación cuando añadas login
    }
  }
}
```

## 🔧 Firebase listo (Firestore + Storage)

El proyecto ya incluye:

- `firestore.rules` (incluye reglas para `foro_hilos`, `foro_respuestas` y `newsletter_subscribers`)
- `storage.rules` (subida de imágenes del foro en `foro_hilos/**`)
- `firebase.json` (apunta a ambos archivos de reglas)
- `.env.example` (variables mínimas para arrancar)

Para desplegar reglas automáticamente con Firebase CLI:

```bash
firebase login
firebase use <tu_project_id>
firebase deploy --only firestore:rules,storage
```

Estado actual en este proyecto:

- `firestore.rules` ya se desplegó correctamente en `miappdecafe`.
- `storage.rules` no puede desplegarse hasta activar Firebase Storage una vez en la consola del proyecto.

Para activarlo:

1. Abre Firebase Console para `miappdecafe`.
2. Entra en `Storage`.
3. Pulsa `Get Started` y completa la inicialización.
4. Después ejecuta `npx firebase-tools deploy --only storage --project miappdecafe`.

Variables mínimas en `.env` para que la subida de fotos funcione:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<tu_project_id>.appspot.com
```

## 🔔 Push remoto (Cloud Functions)

La app ya guarda tokens en `push_subscriptions` y soporta notificaciones locales. Para push remoto real (aunque la app no este abierta), este repo incluye funciones en `functions/` que envian a Expo:

- Nuevo cafe en la comunidad (`cafes` create)
- Nueva respuesta en tu hilo (`foro_respuestas` create)
- Cambio de puntuacion en un favorito (`cafes` update + `favoriteCafeIds`)

Despliegue:

```bash
cd functions
npm install
cd ..
firebase login
firebase use <tu_project_id>
firebase deploy --only functions
```

Notas:

- `firebase.json` ya apunta a `functions` como source.
- Para favoritos, la app sincroniza `favoriteCafeIds` dentro de `push_subscriptions`.

### 5. Arranca la app

```bash
npx expo start
```

Escanea el QR con **Expo Go** o abre en un emulador.

## 📁 Estructura del proyecto

```
Etiove/
├── App.js              # Componente principal y toda la lógica
├── firebaseConfig.js   # Inicialización de Firebase (sin credenciales)
├── app.json            # Configuración de Expo (permisos, iconos, etc.)
├── metro.config.js     # Configuración de Metro (soporte .mjs para Firebase)
├── babel.config.js     # Configuración de Babel
├── .env.example        # Plantilla de variables de entorno
├── assets/             # Imágenes e iconos
└── scripts/            # Scripts de utilidad de Expo
```

## 🔒 Seguridad

- Las credenciales de Firebase **nunca** se incluyen en el código fuente
- Se gestionan mediante variables de entorno con el prefijo `EXPO_PUBLIC_`
- El fichero `.env` está en `.gitignore`
