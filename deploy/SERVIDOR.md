# Servidor de bachedron.javier.tech

Checklist de lo que tiene que existir en el VPS **antes** del primer push a una rama `deploy/…`. El workflow no crea estos archivos: si faltan, el deploy se detiene.

Los puertos 3000 y 6071 ya los usan otros sitios de la misma máquina. Esta app no los toca.

| Qué | Dónde |
|---|---|
| Sitio público | `https://bachedron.javier.tech` → `127.0.0.1:3010` |
| Worker YOLO | solo `127.0.0.1:8010` (no va en nginx) |
| Vídeos | `/var/www/javiermc/bachedron/data/jobs` |
| Web | `/var/www/javiermc/bachedron/web` |
| Analyzer | `/var/www/javiermc/bachedron/analyzer` |

## 1. DNS y certificado

- Registro DNS `bachedron.javier.tech` apuntando al VPS.
- El certificado de `/etc/letsencrypt/live/javier.tech/` tiene que incluir el subdominio. Si no está:

```bash
sudo certbot certonly --nginx -d javier.tech -d bachedron.javier.tech
```

Ajusta los `-d` a los nombres que ya cubre ese certificado.

## 2. Paquetes

En el servidor hacen falta `node`, `nginx`, `ffmpeg` (`ffmpeg` y `ffprobe` en el `PATH`), `python3` con `venv`, y PostgreSQL.

El usuario del deploy es `jmcdeploy`, el mismo de los otros sitios. Tiene que poder escribir en `/var/www/javiermc/bachedron` y reiniciar estos dos servicios con `sudo` sin contraseña:

```
jmcdeploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart bachedron.javier.tech.service, /usr/bin/systemctl restart bachedron-analyzer.javier.tech.service
```

## 3. Carpetas

```bash
sudo mkdir -p /var/www/javiermc/bachedron/data/jobs
sudo chown -R jmcdeploy:jmcdeploy /var/www/javiermc/bachedron
```

El `rsync` del deploy borra la web y el código del analyzer. No borra `data/jobs`, `models/`, `.venv/` ni los `.env` de esta guía.

## 4. Postgres

Crea una base solo para este proyecto. El puerto de abajo es el de Postgres **en el VPS**. En tu PC de desarrollo es 5433; en el servidor usa el puerto real (casi siempre 5432).

```bash
sudo -u postgres psql -c "CREATE USER vial WITH PASSWORD 'UNA_CLAVE_LARGA';"
sudo -u postgres psql -c "CREATE DATABASE vial_monitor OWNER vial;"
```

## 5. `/var/www/javiermc/bachedron/web.env`

Lo lee systemd y también el paso de migraciones. No copies el `.env` local: ahí `JOBS_DIR` y `ANALYZER_URL` apuntan a la máquina de desarrollo, y este archivo pisa los valores de la unidad systemd.

`INTERNAL_TOKEN` tiene que ser **el mismo** que en `analyzer.env`.

```
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Monitoreo Vial con Drones
NEXT_PUBLIC_MAX_UPLOAD_MB=8192

DATABASE_URL=postgresql://vial:UNA_CLAVE_LARGA@127.0.0.1:5432/vial_monitor?schema=public

ANALYZER_URL=http://127.0.0.1:8010
JOBS_DIR=/var/www/javiermc/bachedron/data/jobs
AUTO_MIGRATE=0

API_KEY_CURRENT=UNA_API_KEY
API_KEY_PREVIOUS=
UPLOAD_HMAC_SECRET=UN_SECRETO_HMAC
INTERNAL_TOKEN=UN_TOKEN_INTERNO

MAX_UPLOAD_MB=8192
MIN_FREE_DISK_GB=5
MODEL_WHITELIST=pothole_seg
RATE_LIMIT_PER_MINUTE=60
JOB_TIMEOUT_MINUTES=180
RETENTION_DAYS=30
DELETE_ORIGINAL_AFTER_DAYS=7
```

`API_KEY_CURRENT` y `UPLOAD_HMAC_SECRET` son los que usa la Raspberry. La web, al subir a mano, no los pide.

```bash
chmod 600 /var/www/javiermc/bachedron/web.env
```

## 6. `/var/www/javiermc/bachedron/analyzer.env`

```
INTERNAL_TOKEN=UN_TOKEN_INTERNO
YOLO_WEIGHTS_PATH=/var/www/javiermc/bachedron/analyzer/models/best.pt
WORKER_TMP_DIR=/var/www/javiermc/bachedron/analyzer/tmp
WEB_INTERNAL_URL=http://127.0.0.1:3010

FRAME_STRIDE=15
TARGET_ANALYSIS_FPS=3
TILE_SIZE=1280
TILE_OVERLAP=0.2
ROI=
IMGSZ=640
CONFIDENCE_THRESHOLD=0.35
PROCESSED_MAX_HEIGHT=1440
JOB_TIMEOUT_MINUTES=180
PROGRESS_INTERVAL_SEC=5
```

Copia el `best.pt` a esa ruta **a mano**. El deploy no lo sube y no lo borra.

```bash
mkdir -p /var/www/javiermc/bachedron/analyzer/models /var/www/javiermc/bachedron/analyzer/tmp
chmod 600 /var/www/javiermc/bachedron/analyzer.env
```

El primer deploy crea `.venv` e instala Python ahí. Torch/YOLO solo se instala si todavía no está `ultralytics`.

## 7. systemd y nginx

Desde el repo, una sola vez:

```bash
sudo cp deploy/bachedron.javier.tech.service /etc/systemd/system/
sudo cp deploy/bachedron-analyzer.javier.tech.service /etc/systemd/system/
sudo cp deploy/bachedron.javier.tech.nginx /etc/nginx/sites-available/bachedron.javier.tech
sudo ln -s /etc/nginx/sites-available/bachedron.javier.tech /etc/nginx/sites-enabled/bachedron.javier.tech
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl daemon-reload
sudo systemctl enable bachedron.javier.tech.service bachedron-analyzer.javier.tech.service
```

No hace falta arrancarlos antes del primer deploy: el workflow los reinicia cuando ya copió el build. Si los arrancas ahora, la web falla hasta que exista el `server.js`.

## 8. Secrets del repositorio en GitHub

Los mismos cuatro del sitio de javiermc, en **este** repositorio:

- `VPS_HOST`
- `VPS_USER` (`jmcdeploy`)
- `VPS_SSH_KEY` (clave privada)
- `VPS_PORT` (SSH; si omites el secret, usa 22)

## 9. Primer deploy

Push a una rama cuyo nombre empiece por `deploy/`, por ejemplo `deploy/prod`.

- Cambios en `apps/web` publican la web y corren `prisma migrate deploy`.
- Cambios en `services/analyzer` publican el worker.

Comprueba:

```bash
curl -sS http://127.0.0.1:8010/health
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010/
```

`/health` del worker tiene que decir `"ok": true`. El sitio público es `https://bachedron.javier.tech`.
