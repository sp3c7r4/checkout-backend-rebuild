import type { ResolveFailureKind } from "./client";

interface BuyerMessage {
  status: 400 | 403 | 409 | 503;
  title: string;
  message: string;
  nextStep: string;
}

const MESSAGES: Record<ResolveFailureKind, BuyerMessage> = {
  missing_token: {
    status: 400,
    title: "We couldn't finish setting up your subscription",
    message: "This link is missing the information we need from AWS Marketplace.",
    nextStep: "Return to your AWS Marketplace subscription page and choose \u201cSet up your account\u201d again.",
  },
  expired_token: {
    status: 403,
    title: "This setup link has expired",
    message: "For your security, AWS Marketplace setup links can only be used once and expire quickly.",
    nextStep: "Return to AWS Marketplace and click \u201cSet up your account\u201d to get a fresh link.",
  },
  invalid_token: {
    status: 403,
    title: "We couldn't verify this setup link",
    message: "The link was already used, or it does not belong to this product.",
    nextStep: "Return to AWS Marketplace and click \u201cSet up your account\u201d to get a fresh link.",
  },
  disabled_api: {
    status: 503,
    title: "Subscriptions are temporarily unavailable",
    message: "Our marketplace integration is paused on the AWS side right now.",
    nextStep: "Please try again shortly, or contact support and we will finish setting up your account.",
  },
  throttled: {
    status: 503,
    title: "AWS Marketplace is busy",
    message: "We couldn't reach AWS Marketplace after several attempts.",
    nextStep: "Try again in a few minutes, or contact support and we will finish setting up your account.",
  },
  internal: {
    status: 503,
    title: "Something went wrong on our side",
    message: "We couldn't complete the setup just now.",
    nextStep: "Try again in a few minutes, or contact support and we will finish setting up your account.",
  },
  product_mismatch: {
    status: 403,
    title: "This subscription is for a different product",
    message: "The subscription details we received do not match Checkout.",
    nextStep: "Return to AWS Marketplace and start the setup from the Checkout listing.",
  },
  unknown: {
    status: 503,
    title: "We couldn't finish setting up your subscription",
    message: "An unexpected problem stopped us from completing the setup.",
    nextStep: "Try again in a few minutes, or contact support and we will finish setting up your account.",
  },
};

export function buyerMessage(kind: ResolveFailureKind): BuyerMessage {
  return MESSAGES[kind] ?? MESSAGES.unknown;
}

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string)
  );

/** Minimal server-rendered page: never a stack trace, always a next step. */
export function renderBuyerPage({ title, message, nextStep, status }: BuyerMessage): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(title)} · Checkout</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0b0b0c;
         color:#f5f5f4; font:16px/1.6 ui-sans-serif, system-ui, -apple-system, sans-serif; padding:24px; }
  main { max-width:32rem; background:#161617; border:1px solid #2a2a2c; border-radius:16px; padding:32px; }
  h1 { font-size:1.25rem; margin:0 0 12px; }
  p { margin:0 0 16px; color:#a1a1aa; }
  .next { border-left:3px solid #f59e0b; padding-left:12px; color:#f5f5f4; }
  a { color:#fbbf24; }
  .status { font-size:.8125rem; color:#71717a; margin-top:24px; }
</style>
</head>
<body>
<main>
  <h1>${escape(title)}</h1>
  <p>${escape(message)}</p>
  <p class="next">${escape(nextStep)}</p>
  <p class="status">Reference: ${status}</p>
</main>
</body>
</html>`;
}

export function renderBuyerErrorPage(kind: ResolveFailureKind): { body: string; status: BuyerMessage["status"] } {
  const message = buyerMessage(kind);
  return { body: renderBuyerPage(message), status: message.status };
}
