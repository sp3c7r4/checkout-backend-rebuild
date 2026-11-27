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

## AWS Marketplace fulfilment

AWS sends the buyer to the site root with a one-time `x-amzn-marketplace-token`.
That POST is handled by the API, never by the SPA:

1. `POST /` → edge nginx → `POST /api/v1/marketplace/fulfillment` (form-encoded).
2. The API calls `ResolveCustomer` (`AWS_MARKETPLACE_REGION`, default `us-east-1`)
   with credentials from the standard AWS chain.
3. Identifiers are upserted into `marketplace_subscription`
   (unique on `customer_aws_account_id` + `product_code`).
4. If the buyer has no session (always true on the cross-site POST), the identifiers
   are parked in `marketplace_pending` for 15 minutes and referenced by an opaque
   single-use id in the redirect fragment: `303 ${WEB_ORIGIN}/#mp=<id>`.
5. The SPA lifts the id out of the fragment, rewrites it away, and calls
   `POST /api/v1/marketplace/claim`, which attaches the parked identifiers to the
   signed-in account.

Set `AWS_MARKETPLACE_PRODUCT_CODE` in production; without it a valid token from any
product is accepted. No cookie is involved, so the hand-off works across origins and
without TLS - but serve the app over HTTPS anyway.

## Checks

```bash
npm test                            # unit tests (AWS client mocked)
npx tsc --noEmit                    # typecheck
npx tsx scripts/smoke-deepseek.ts   # live DeepSeek provider + tool calling + memory
node ../e2e-api.mjs                 # HTTP API end-to-end
```

## Database

```bash
npm run db:generate
npm run db:push
```
