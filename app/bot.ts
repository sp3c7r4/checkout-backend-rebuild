import "dotenv/config";

// quiet Mastra's telemetry notice; this process has no instrumentation file
(globalThis as any).___MASTRA_TELEMETRY___ = true;

const REQUIRED = ["TELEGRAM_BOT_TOKEN", "DEEPSEEK_API_KEY"] as const;

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`bot: missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const apiRoot = (process.env.TELEGRAM_API_ROOT || "https://api.telegram.org").replace(/\/+$/, "");

// Preflight: Telegraf's long-poll launch hangs forever when the host blackholes
// packets, so fail within 10s with a named cause instead.
const preflight = async () => {
  try {
    const res = await fetch(`${apiRoot}/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`, {
      signal: AbortSignal.timeout(10_000),
    });
    const body: any = await res.json();
    if (!body.ok) throw new Error(`${body.error_code ?? res.status} ${body.description ?? "getMe failed"}`);
    console.log(`bot: connected as @${body.result.username}`);
  } catch (error: any) {
    console.error(`bot: cannot reach the Telegram Bot API at ${apiRoot}:`, error?.cause?.code || error?.message || error);
    if (!process.env.TELEGRAM_API_ROOT) {
      console.error(
        "bot: api.telegram.org looks blocked on this network - deploy a relay (infra/telegram-relay/README.md) and set TELEGRAM_API_ROOT"
      );
    }
    process.exit(1);
  }
};

await preflight();

// Loaded after validation so a bad config fails before any provider or DB setup.
const { default: Checkout } = await import("../src/utils/checkout-bot");

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.warn("bot: GOOGLE_GENERATIVE_AI_API_KEY is not set - semantic recall is off (message history still works)");
}

const bot = new Checkout(process.env.TELEGRAM_BOT_TOKEN, {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB || 0),
});

bot.started.catch((error: any) => {
  console.error("bot: failed to poll Telegram:", error?.message || error);
  process.exit(1);
});

console.log("🤖 Telegram bot polling started");

export default bot;
