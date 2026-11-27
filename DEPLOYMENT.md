# Deployment

Everything is prepared to run on one box (EC2 or any VPS) with Docker Compose, or split later without code changes.

## What runs

| service | image | port | notes |
|---|---|---|---|
| `api` | built from `./backend` | 3000 | runs `drizzle-kit migrate` on start, then `npm start` |
| `bot` | same image | — | `npm run bot`; needs a host that can reach `api.telegram.org` |
| `web` | built from `./frontend` | 80 → 8080 | nginx, SPA fallback; `VITE_*` baked at build |
| `db` | `pgvector/pgvector:pg18` | 5432 | volume `pgdata` |
| `redis` | `redis:7-alpine` | 6379 | volume `redisdata` |

## First deploy (single box)

```bash
# on the box
sudo apt install -y docker.io docker-compose-v2 git caddy
sudo usermod -aG docker ubuntu

sudo mkdir -p /srv/checkout && sudo chown ubuntu:ubuntu /srv/checkout
cd /srv/checkout
git clone git@github.com:sp3c7r4/checkout-backend-rebuild.git backend
git clone git@github.com:sp3c7r4/checkout-ui-rebuild.git frontend
cd backend && cp .env.production.example .env && nano .env   # fill in secrets, set PUBLIC_API_ORIGIN

docker compose up -d --build       # run from /srv/checkout/backend
docker compose ps
curl localhost:3000/ && curl -I localhost:8080/
```

`PUBLIC_API_ORIGIN` is baked into the SPA at build time. Change it → `docker compose build web && docker compose up -d web`.

## TLS + domains

`deploy/Caddyfile` (Caddy on the host, certs automatic):

```bash
sudo cp backend/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile      # replace example.com / api.example.com
sudo systemctl reload caddy
```

Then set in `.env`: `WEB_ORIGIN=https://example.com`, `API_ORIGIN=https://api.example.com`, `PUBLIC_API_ORIGIN=https://api.example.com`, and
rebuild `web`. In Google Cloud Console, add the authorized redirect URI
`https://api.example.com/api/auth/callback/google`.

## CI/CD

Each repo deploys itself on push to `main`, over SSH to the same box:

| repo secret | value |
|---|---|
| `EC2_HOST` | host or IP |
| `EC2_USER` | `ubuntu` |
| `EC2_PRIVATE_KEY` | private key with access to the box |

Without those secrets the workflow skips the deploy step and only typechecks/builds. The box keeps `/srv/checkout/{backend,frontend}` as git checkouts; the workflow pulls, rebuilds the changed container, and restarts it.

## Backups

```bash
sudo crontab -e
0 3 * * * /srv/checkout/backend/deploy/backup.sh >> /var/log/checkout-backup.log 2>&1
```
Keeps 14 days in `backups/`. Uncomment the `aws s3 cp` line to ship them off the box.

## Why one box

- One origin pair to configure (`WEB_ORIGIN` / `API_ORIGIN`), no cross-service networking to debug.
- The bot must be reachable to Telegram; pick a region where `api.telegram.org` is not blocked (eu-west-1 works). If it is blocked, set `TELEGRAM_API_ROOT` to the relay in `infra/telegram-relay`.
- Moving to managed Postgres later = delete the `db` service, point `DATABASE_URL` at RDS, restore a dump. No app change.

## Verify a deploy

```bash
cd /srv/checkout/backend
docker compose logs -f api          # "Server running at http://localhost:3000"
docker compose exec api npx tsx -e "console.log(process.env.API_ORIGIN)"
node e2e-api.mjs                    # 29 checks, needs BASE=http://localhost:3000
```

## Current production topology (AWS)

| Piece | Where | Notes |
|---|---|---|
| SPA | **Amplify Hosting** app `d1h9r18oox0754`, branch `main` → https://main.d1h9r18oox0754.amplifyapp.com | Manual zip deploys (no Git connection yet). SPA rewrite rule falls back to `/index.html`. |
| API | **API Gateway HTTP API** `21uedtdh30` → https://21uedtdh30.execute-api.us-east-1.amazonaws.com | Route `$default` → HTTP_PROXY integration to `http://44.218.47.11:3000`. |
| API runtime | EC2 `i-03707c8eb3e688111` (44.218.47.11) | `docker compose`: api, bot, db, redis (+ web, no longer the buyer-facing SPA). |

### Two API Gateway details that cost time

1. Do not put a path in the integration URI. `ANY /{proxy+}` with `http://host:3000` makes API Gateway send every request to that path — the backend then sees `POST /` for `/api/auth/sign-in/email`. Use a **`$default` route** with the bare host URI; the full path is forwarded.
2. Amplify is static hosting, so `POST /` there is not possible. The Marketplace **fulfillment URL is the gateway**:
   `https://21uedtdh30.execute-api.us-east-1.amazonaws.com/api/v1/marketplace/fulfillment`.
   The handler `303`s to `WEB_ORIGIN` with `#mp=<id>`, which lands on the Amplify app.

### Cross-site session cookie

The SPA (`*.amplifyapp.com`) and the API (`*.execute-api.amazonaws.com`) are different sites, so `auth.ts`
switches to `Secure; SameSite=None` cookies whenever `API_ORIGIN` is https and differs from `WEB_ORIGIN`.
CORS allows both origins with credentials, driven by the same two env vars.

- `WEB_ORIGIN` and `API_ORIGIN` in `/srv/checkout/backend/.env` must match the deployed SPA and gateway URLs,
  or sign-in fails with no obvious error.
- The IP-served SPA on port 80 still loads but is no longer an allowed origin, so its API calls get CORS errors.

### Deploying the SPA to Amplify

```bash
cd frontend
VITE_API_ORIGIN=https://21uedtdh30.execute-api.us-east-1.amazonaws.com \
VITE_SERVER_ORIGIN=https://21uedtdh30.execute-api.us-east-1.amazonaws.com/api/v1 \
npx vite build
# zip the CONTENTS of dist (index.html at the archive root), then:
aws amplify create-deployment --app-id d1h9r18oox0754 --branch-name main   # -> jobId + zipUploadUrl
curl -H "Content-Type: application/zip" --upload-file site.zip "$ZIP_UPLOAD_URL"
aws amplify start-deployment --app-id d1h9r18oox0754 --branch-name main --job-id "$JOB_ID"
```

Port 3000 stays public because API Gateway reaches the box over the instance IP; closing it needs an
NLB + VPC Link (or CloudFront) in front of the instance.
