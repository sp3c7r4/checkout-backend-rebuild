import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createMarketplaceController } from "../src/controller/marketplace.controller";
import { createMarketplaceResolver, type ResolveCustomerFn } from "../src/marketplace/client";
import type { MarketplaceStore, ResolvedIdentifiers } from "../src/marketplace/store";

const TOKEN = "secret-registration-token-value";
const ACCOUNT = "123456789012";
const PRODUCT = "prod-abc123";
const LICENSE = "arn:aws:license-manager::123456789012:license:l-abc";

/** In-memory stand-in that mimics the unique (account, product) upsert. */
function fakeStore(): MarketplaceStore & { subs: any[]; pending: Map<string, any>; calls: string[] } {
  const subs: any[] = [];
  const pending = new Map<string, any>();
  const calls: string[] = [];
  let n = 0;

  return {
    subs,
    pending,
    calls,
    async upsertSubscription({ userId, customerAwsAccountId, productCode, licenseArn }: ResolvedIdentifiers & { userId?: string | null }) {
      calls.push("upsert");
      const existing = subs.find((s) => s.customer_aws_account_id === customerAwsAccountId && s.product_code === productCode);
      if (existing) {
        existing.license_arn = licenseArn;
        existing.updated_at = new Date();
        if (userId) existing.user_id = userId;
        return existing;
      }
      const row = {
        id: `sub-${++n}`,
        user_id: userId ?? null,
        customer_aws_account_id: customerAwsAccountId,
        product_code: productCode,
        license_arn: licenseArn,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      };
      subs.push(row);
      return row;
    },
    async createPending(identifiers: ResolvedIdentifiers, ttlMs: number) {
      calls.push("createPending");
      const id = `pend-${++n}`;
      pending.set(id, { ...identifiers, expiresAt: new Date(Date.now() + ttlMs), consumed: false });
      return { id, expiresAt: new Date(Date.now() + ttlMs) };
    },
    async consumePending(id: string) {
      calls.push("consumePending");
      const row = pending.get(id);
      if (!row || row.consumed || row.expiresAt.getTime() < Date.now()) return null;
      row.consumed = true;
      return { id, customerAwsAccountId: row.customerAwsAccountId, productCode: row.productCode, licenseArn: row.licenseArn };
    },
    async findForUser(userId: string) {
      return subs.filter((s) => s.user_id === userId);
    },
  };
}

const okResolver = (): ResolveCustomerFn => async () => ({
  ok: true,
  customerAwsAccountId: ACCOUNT,
  productCode: PRODUCT,
  licenseArn: LICENSE,
});

interface AppOptions {
  resolve?: ResolveCustomerFn;
  store?: MarketplaceStore;
  user?: { id: string } | null;
  logs?: Array<[string, Record<string, unknown>]>;
}

function makeApp({ resolve = okResolver(), store = fakeStore(), user = null, logs = [] }: AppOptions = {}) {
  const controller = createMarketplaceController({
    resolve,
    store,
    getSessionUser: async () => user,
    log: (event, data) => logs.push([event, data]),
  });

  const app = new Hono();
  app.get("/", (c) => c.text("spa"));
  app.post("/api/v1/marketplace/fulfillment", controller.fulfillment);
  app.post("/api/v1/marketplace/claim", controller.claim);
  return { app, store, logs };
}

const postForm = (token?: string) => ({
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: token === undefined ? "" : new URLSearchParams({ "x-amzn-marketplace-token": token }).toString(),
});

test("GET / still serves the app", async () => {
  const { app } = makeApp();
  const res = await app.request("/", { method: "GET" });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "spa");
});

test("successful resolve without a session parks the identifiers server-side", async () => {
  const store = fakeStore();
  const { app } = makeApp({ store });
  const res = await app.request("/api/v1/marketplace/fulfillment", postForm(TOKEN));

  assert.equal(res.status, 303);
  assert.equal(res.headers.get("set-cookie"), null);
  assert.match(res.headers.get("location") ?? "", /\/#mp=./);
  assert.equal(store.subs.length, 0);
  assert.equal(store.pending.size, 1);
  const parked = [...store.pending.values()][0];
  assert.equal(parked.customerAwsAccountId, ACCOUNT);
  assert.equal(parked.productCode, PRODUCT);
  assert.equal(parked.licenseArn, LICENSE);
});

test("successful resolve with a session attaches immediately and carries no pending id", async () => {
  const store = fakeStore();
  const { app } = makeApp({ store, user: { id: "user-1" } });
  const res = await app.request("/api/v1/marketplace/fulfillment", postForm(TOKEN));

  assert.equal(res.status, 303);
  assert.equal(res.headers.get("set-cookie"), null);
  assert.doesNotMatch(res.headers.get("location") ?? "", /#mp=/);
  assert.equal(store.subs.length, 1);
  assert.equal(store.subs[0].user_id, "user-1");
  assert.equal(store.subs[0].customer_aws_account_id, ACCOUNT);
});

test("missing token is rejected without calling AWS", async () => {
  let called = false;
  const { app, store } = makeApp({
    resolve: async () => {
      called = true;
      return { ok: true, customerAwsAccountId: ACCOUNT, productCode: PRODUCT, licenseArn: LICENSE };
    },
  });
  const res = await app.request("/api/v1/marketplace/fulfillment", postForm());

  assert.equal(res.status, 400);
  assert.equal(called, false);
  assert.equal(store.pending.size, 0);
  const body = await res.text();
  assert.match(body, /Set up your account/);
  assert.doesNotMatch(body, /at |\.ts:\d+/); // no stack traces
});

test("expired token renders the expiry message", async () => {
  const { app } = makeApp({ resolve: async () => ({ ok: false, kind: "expired_token" }) });
  const res = await app.request("/api/v1/marketplace/fulfillment", postForm(TOKEN));
  assert.equal(res.status, 403);
  assert.match(await res.text(), /expired/i);
});

test("invalid token renders the verification message", async () => {
  const { app } = makeApp({ resolve: async () => ({ ok: false, kind: "invalid_token" }) });
  const res = await app.request("/api/v1/marketplace/fulfillment", postForm(TOKEN));
  assert.equal(res.status, 403);
  assert.match(await res.text(), /verify this setup link/i);
});

test("disabled api and internal errors are server-side failures", async () => {
  for (const kind of ["disabled_api", "internal", "unknown"] as const) {
    const { app } = makeApp({ resolve: async () => ({ ok: false, kind }) });
    const res = await app.request("/api/v1/marketplace/fulfillment", postForm(TOKEN));
    assert.equal(res.status, 503, kind);
  }
});

test("re-delivery of the same subscription updates instead of duplicating", async () => {
  const store = fakeStore();
  const { app } = makeApp({ store, user: { id: "user-1" } });

  await app.request("/api/v1/marketplace/fulfillment", postForm(TOKEN));
  const second = await app.request("/api/v1/marketplace/fulfillment", postForm(TOKEN));

  assert.equal(second.status, 303);
  assert.equal(store.subs.length, 1);
  assert.equal(store.subs[0].license_arn, LICENSE);
});

test("claim links the parked identifiers to the signed-in account", async () => {
  const store = fakeStore();
  const parked = makeApp({ store });
  const res = await parked.app.request("/api/v1/marketplace/fulfillment", postForm(TOKEN));
  const pendingId = (res.headers.get("location") ?? "").split("#mp=")[1];

  const { app } = makeApp({ store, user: { id: "user-9" } });
  const claim = await app.request("/api/v1/marketplace/claim", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": "user-1" },
    body: JSON.stringify({ pending: pendingId }),
  });

  assert.equal(claim.status, 200);
  const body = (await claim.json()) as any;
  assert.equal(body.data.user_id, "user-9");
  assert.equal(body.data.customer_aws_account_id, ACCOUNT);
  assert.equal(claim.headers.get("set-cookie"), null);
});

test("claim without a session is refused", async () => {
  const { app } = makeApp({ user: null });
  const res = await app.request("/api/v1/marketplace/claim", { method: "POST" });
  assert.equal(res.status, 401);
});

test("claim without an id, or with a junk id, links nothing", async () => {
  const store = fakeStore();
  const { app } = makeApp({ store, user: { id: "user-1" } });
  for (const body of ["{}", JSON.stringify({ pending: "" }), JSON.stringify({ pending: "x".repeat(500) })]) {
    const res = await app.request("/api/v1/marketplace/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Nothing to link/);
  }
  assert.equal(store.subs.length, 0);
});

test("claim with an expired pending record explains what to do", async () => {
  const store = fakeStore();
  const [id] = ["pend-expired"];
  await store.createPending(
    { customerAwsAccountId: ACCOUNT, productCode: PRODUCT, licenseArn: LICENSE },
    1
  );
  store.pending.set(id, {
    customerAwsAccountId: ACCOUNT,
    productCode: PRODUCT,
    licenseArn: LICENSE,
    expiresAt: new Date(Date.now() - 1000),
    consumed: false,
  });

  const { app } = makeApp({ store, user: { id: "user-1" } });
  const res = await app.request("/api/v1/marketplace/claim", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": "user-1" },
    body: JSON.stringify({ pending: id }),
  });

  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  assert.equal(body.data, null);
  assert.match(body.message, /expired/i);
  assert.equal(store.subs.length, 0);
});

test("the registration token is never logged", async () => {
  const logs: Array<[string, Record<string, unknown>]> = [];
  const { app } = makeApp({ logs, resolve: async () => ({ ok: false, kind: "invalid_token" }) });
  await app.request("/api/v1/marketplace/fulfillment", postForm(TOKEN));

  const serialized = JSON.stringify(logs);
  assert.ok(logs.length > 0);
  assert.ok(!serialized.includes(TOKEN), "token leaked into logs");
  assert.match(serialized, /present:\d+/);
});

// --- resolver: AWS client mocked ---

function awsClient(responses: Array<{ ok?: any; error?: { name: string } }>) {
  let i = 0;
  return {
    send: async () => {
      const next = responses[Math.min(i++, responses.length - 1)];
      if (next.error) {
        const err = new Error(next.error.name);
        err.name = next.error.name;
        throw err;
      }
      return next.ok;
    },
    destroy: () => {},
  } as any;
}

const resolvedResponse = {
  CustomerAWSAccountId: ACCOUNT,
  ProductCode: PRODUCT,
  LicenseArn: LICENSE,
  CustomerIdentifier: "deprecated-ignored",
};

test("resolver retries throttling and succeeds", async () => {
  let attempts = 0;
  const client = {
    send: async () => {
      attempts++;
      if (attempts < 3) {
        const err = new Error("ThrottlingException");
        err.name = "ThrottlingException";
        throw err;
      }
      return resolvedResponse;
    },
    destroy: () => {},
  } as any;

  const resolve = createMarketplaceResolver({ client, sleep: async () => {}, attempts: 3 });
  const result = await resolve(TOKEN);

  assert.equal(result.ok, true);
  assert.equal(attempts, 3);
  assert.deepEqual(
    result.ok && {
      account: result.customerAwsAccountId,
      product: result.productCode,
      license: result.licenseArn,
    },
    { account: ACCOUNT, product: PRODUCT, license: LICENSE }
  );
});

test("resolver gives up after the retry budget and reports throttled", async () => {
  const resolve = createMarketplaceResolver({
    client: awsClient([{ error: { name: "ThrottlingException" } }]),
    sleep: async () => {},
    attempts: 3,
  });
  const result = await resolve(TOKEN);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.kind, "throttled");
});

test("resolver does not retry token errors", async () => {
  let attempts = 0;
  const client = {
    send: async () => {
      attempts++;
      const err = new Error("ExpiredTokenException");
      err.name = "ExpiredTokenException";
      throw err;
    },
    destroy: () => {},
  } as any;

  const resolve = createMarketplaceResolver({ client, sleep: async () => {}, attempts: 3 });
  const result = await resolve(TOKEN);

  assert.equal(attempts, 1);
  assert.equal(!result.ok && result.kind, "expired_token");
});

test("resolver rejects a different product code", async () => {
  const resolve = createMarketplaceResolver({
    client: awsClient([{ ok: resolvedResponse }]),
    expectedProductCode: "prod-someone-else",
  });
  const result = await resolve(TOKEN);
  assert.equal(!result.ok && result.kind, "product_mismatch");
});

test("resolver treats an empty token as missing without calling AWS", async () => {
  let called = false;
  const resolve = createMarketplaceResolver({
    client: { send: async () => ((called = true), resolvedResponse), destroy: () => {} } as any,
  });
  const result = await resolve("   ");
  assert.equal(called, false);
  assert.equal(!result.ok && result.kind, "missing_token");
});
