import { Hono } from "hono";
import type { Context } from "hono";
import { createMarketplaceController } from "../controller/marketplace.controller";
import { createMarketplaceResolver } from "../marketplace/client";
import { drizzleMarketplaceStore } from "../marketplace/store";
import { auth } from "../../auth";

const router = new Hono();

const { fulfillment, claim } = createMarketplaceController({
  resolve: createMarketplaceResolver(),
  store: drizzleMarketplaceStore,
  getSessionUser: async (c: Context) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    return session?.user ? { id: session.user.id } : null;
  },
});

// AWS Marketplace sends this cross-site; exempt from CSRF at the app level.
router.post("/fulfillment", fulfillment);
router.post("/claim", claim);

export default router;
