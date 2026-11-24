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
   are parked in `marketplace_pending` and referenced by an httpOnly `mp_pending`
   cookie for 15 minutes.
5. The buyer is redirected with `303` to `/`; the SPA calls
   `POST /api/v1/marketplace/claim`, which attaches the parked identifiers to the
   signed-in account and clears the cookie.

Set `AWS_MARKETPLACE_PRODUCT_CODE` in production; without it a valid token from any
product is accepted. The pending cookie needs HTTPS (`Secure; SameSite=None`) to
survive the cross-site POST.

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
