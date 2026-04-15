# Deploy de la web a Cloudflare Pages

La web estática de Etiove se publica desde la carpeta `web/` en Cloudflare Pages.

## Proyecto activo

- Proyecto Pages: `etiove`
- Dominios: `etiove.pages.dev` y `etiove.com`

## 1) Requisitos

- Tener acceso autenticado a Cloudflare desde Wrangler

Comprobar sesión y proyectos:

```bash
npx wrangler whoami
npx wrangler pages project list
```

## 2) Deploy preview

Publica la carpeta `web/` en una rama preview de Pages:

```bash
npm run web:deploy
```

## 3) Deploy producción

Publica directamente en producción:

```bash
npm run web:deploy:prod
```

## 4) Comandos reales usados por el proyecto

```bash
cd web && npx wrangler pages deploy . --project-name etiove --branch preview --no-bundle --commit-dirty=true
cd web && npx wrangler pages deploy . --project-name etiove --no-bundle --commit-dirty=true
```

## 5) Nota importante

Firebase sigue siendo la base de datos y backend del proyecto, pero no aloja la web pública.

Además, este repositorio tiene una carpeta `functions/` de Firebase en la raíz. Por eso el deploy de Pages se lanza desde `web/` y con `--no-bundle`, para que Cloudflare publique solo los estáticos y no intente procesar esas funciones.
