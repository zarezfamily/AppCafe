# Deploy directo de la web a Netlify

Este proyecto publica la web desde la carpeta `web/`.

## 1) Variables necesarias

Configura estas variables en tu terminal (o en tu `~/.zshrc`):

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Puedes obtenerlas en Netlify:

- User settings -> Applications -> Personal access tokens
- Site settings -> General -> Site details -> API ID

## 2) Deploy preview (borrador)

```bash
npm run web:deploy
```

## 3) Deploy producción (live)

```bash
npm run web:deploy:prod
```

## 4) Deploy automático por push a GitHub (opcional)

Si tu sitio de Netlify ya está conectado al repositorio, cada `git push origin main` disparará deploy automáticamente y usará `netlify.toml` para publicar `web/`.
