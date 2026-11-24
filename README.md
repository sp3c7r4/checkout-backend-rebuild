# checkout-backend

Node/npm only — no Bun.

## Install

```bash
npm install
```

## HTTP API

```bash
npm run dev      # http://localhost:3000
```

## Telegram bot (DeepSeek)

Runs as its own process, separate from the API.

```bash
npm run bot
```

Required in `.env` (see `.env.example`):

| Key | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres |
| `DEEPSEEK_API_KEY` | yes | https://platform.deepseek.com/api_keys |
| `DEEPSEEK_MODEL` | no | defaults to `deepseek-flash` |
| `TELEGRAM_BOT_TOKEN` | yes | from @BotFather |
| `DB_MEMORY` | no | falls back to `DATABASE_URL` |
| `TELEGRAM_API_ROOT` | no | relay URL when `api.telegram.org` is blocked — see `../infra/telegram-relay/README.md` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | no | enables semantic recall (needs pgvector); message history works without it |

## Checks

```bash
npx tsc --noEmit                    # typecheck
npx tsx scripts/smoke-deepseek.ts   # live DeepSeek provider + tool calling + memory
node ../e2e-api.mjs                 # HTTP API end-to-end
```

## Database

```bash
npm run db:generate
npm run db:push
```
