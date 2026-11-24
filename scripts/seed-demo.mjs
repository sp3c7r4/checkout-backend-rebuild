/**
 * Seeds a demo admin + business + products so the dashboard has data to look at.
 *   node scripts/seed-demo.mjs
 * Re-runnable: signs in instead of signing up if the account already exists.
 */
const BASE = process.env.SEED_API ?? "http://localhost:3000";
const EMAIL = process.env.SEED_EMAIL ?? "demo@checkout.local";
const PASSWORD = process.env.SEED_PASSWORD ?? "Password123";
const BUSINESS = process.env.SEED_BUSINESS ?? "demo market";

let cookie = "";

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

const signUp = await call("POST", "/api/auth/sign-up/email", { name: "Demo Admin", email: EMAIL, password: PASSWORD });
if (signUp.status === 200) {
  console.log("created", EMAIL);
} else {
  const signIn = await call("POST", "/api/auth/sign-in/email", { email: EMAIL, password: PASSWORD });
  if (signIn.status !== 200) throw new Error(`login failed for ${EMAIL}: ${JSON.stringify(signIn.json)}`);
  console.log("signed in as existing", EMAIL);
}

let business = (await call("GET", "/api/v1/admin/business")).json?.data;
if (!business?.id) {
  const created = await call("POST", "/api/v1/admin/business/create", {
    name: BUSINESS,
    email: EMAIL,
    street: "1 demo avenue",
    state: "lagos",
    country: "nigeria",
  });
  if (created.status !== 201) throw new Error(`business create failed: ${JSON.stringify(created.json)}`);
  business = created.json.data;
  console.log("business created:", BUSINESS, business.id);
} else {
  console.log("business exists:", business.name, business.id);
}

const seedProducts = [
  { name: "indomie chicken", price: "500", quantity: 40, kg: "0.5", description: "Instant noodles, chicken flavour", image: "https://placehold.co/600x400?text=indomie" },
  { name: "peak milk", price: "1200", quantity: 25, kg: "0.4", description: "Evaporated milk 170g", image: "https://placehold.co/600x400?text=peak" },
  { name: "golden penny rice", price: "4500", quantity: 12, kg: "5", description: "Long grain parboiled rice 5kg", image: "https://placehold.co/600x400?text=rice" },
  { name: "coca cola", price: "250", quantity: 60, kg: "0.6", description: "Chilled 50cl bottle", image: "https://placehold.co/600x400?text=cola" },
];

const existing = (await call("GET", `/api/v1/admin/products/${business.id}`)).json?.data ?? [];
for (const product of seedProducts) {
  if (existing.some((p) => p.name === product.name)) continue;
  const res = await call("POST", "/api/v1/admin/products", { ...product, business_id: business.id });
  console.log(res.status === 201 ? `product: ${product.name}` : `product failed: ${JSON.stringify(res.json)}`);
}

const settings = (await call("GET", `/api/v1/admin/settings/${business.id}`)).json?.data;
if (settings?.id && !settings.notifications?.state) {
  await call("POST", "/api/v1/admin/settings/update", { settings_id: settings.id, business_id: business.id, notifications: true });
  console.log("notifications enabled");
}

const products = (await call("GET", `/api/v1/admin/products/${business.id}`)).json?.data ?? [];
console.log(`\nready: ${EMAIL} / ${PASSWORD}`);
console.log(`business: ${business.name} | products: ${products.length}`);
