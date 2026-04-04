# Deploy de la web a Firebase Hosting

Este proyecto publica la web estática desde la carpeta `web/` usando Firebase Hosting del proyecto `miappdecafe`.

## 1) Requisitos

- Tener instalado `firebase-tools` o usar `npx firebase-tools`
- Tener sesión iniciada en Firebase CLI:

```bash
npx firebase-tools login
```

## 2) Deploy preview

Esto crea o actualiza un canal preview de Hosting:

```bash
npm run web:deploy
```

## 3) Deploy producción

Esto publica directamente la carpeta `web/` en Hosting:

```bash
npm run web:deploy:prod
```

## 4) Configuración usada

- Proyecto Firebase: `miappdecafe`
- Carpeta publicada: `web/`
- Configuración de Hosting: `firebase.json`

## 5) Nota importante

Netlify ya no forma parte del flujo de despliegue de esta web. Cualquier referencia antigua a Netlify debe considerarse obsoleta.