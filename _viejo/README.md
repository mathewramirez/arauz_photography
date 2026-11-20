# Arauz Photography

Sitio web + panel de administración (Node.js / Express).

## Correr en tu computadora
```
npm install
npm start
```
- Sitio: http://localhost:3000
- Panel: http://localhost:3000/admin  (contraseña temporal: `arauz2026`)

## Variables de entorno
| Variable | Para qué |
|---|---|
| `ADMIN_PASSWORD` | Contraseña del panel /admin |
| `SESSION_SECRET` | Texto largo aleatorio para firmar la sesión |
| `DATA_DIR` | Carpeta donde se guardan fotos y datos (en Railway: la ruta del Volume, ej. `/data`) |

## Railway
1. Sube esta carpeta a un repo de GitHub.
2. En Railway: New Project → Deploy from GitHub repo.
3. Agrega un **Volume** montado en `/data` y define `DATA_DIR=/data` (si no, las fotos se borran en cada deploy).
4. Define `ADMIN_PASSWORD` y `SESSION_SECRET`.
5. Settings → Networking → Generate Domain.
