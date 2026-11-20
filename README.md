# Arauz Photography

Sitio web de estudio fotográfico con panel de administración para subir fotos.

## Estructura
```
arauz-photography/
├── api/index.js             entrada para Vercel (función serverless)
├── vercel.json              configuración de Vercel
├── backend/
│   ├── src/
│   │   ├── server.js        arranque local
│   │   ├── app.js           configuración de Express
│   │   ├── config.js        variables de entorno
│   │   ├── routes/          auth, photos, settings, messages
│   │   ├── middleware/      requireAdmin, upload
│   │   └── lib/             storage (disco o Vercel Blob), session, wrap
│   ├── data/                fotos y datos en local (no se sube a git)
│   └── .env.example
├── frontend/                sitio estático (HTML/CSS/JS)
│   ├── index.html, admin.html
│   ├── css/  js/  img/
└── package.json
```

## Correr en local
```
npm install
npm start
```
- Sitio: http://localhost:3000 · Panel: http://localhost:3000/admin (contraseña temporal `arauz2026`)
- Puerto ocupado (PowerShell): `$env:PORT=3001; npm start`
- En local las fotos se guardan en `backend/data/`.

## Variables de entorno
| Variable | Para qué |
|---|---|
| `ADMIN_PASSWORD` | Contraseña del panel |
| `SESSION_SECRET` | Texto largo aleatorio para firmar la sesión |
| `BLOB_READ_WRITE_TOKEN` | Vercel la crea sola al conectar el Blob Store (activa el modo Vercel) |
| `DATA_DIR` | Solo Railway/servidor propio: carpeta del Volume (ej. `/data`) |

## Desplegar en Vercel
1. Sube el proyecto a GitHub (la raíz del repo es esta carpeta).
2. En vercel.com: **Add New → Project** → importa el repo. Framework Preset: **Other**. No cambies nada más.
3. Antes de usarlo: pestaña **Storage → Create → Blob**, elige acceso **Public** y conéctalo al proyecto (esto agrega `BLOB_READ_WRITE_TOKEN`).
4. **Settings → Environment Variables**: agrega `ADMIN_PASSWORD` y `SESSION_SECRET`.
5. **Deployments → Redeploy** para que tome las variables.

Notas: Vercel limita cada petición a 4.5 MB, por eso el panel comprime y sube las fotos de una en una. Revisa los términos del plan Hobby de Vercel (uso personal/no comercial) si el sitio es para un negocio.

## Alternativa: Railway
Un solo servicio Node con un **Volume** montado en `/data` y `DATA_DIR=/data`; define también `ADMIN_PASSWORD` y `SESSION_SECRET`.
