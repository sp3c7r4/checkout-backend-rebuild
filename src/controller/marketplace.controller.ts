import type { Context } from "hono";
import { OK } from "../utils/Response";
import { isResolveFailure, type ResolveCustomerFn } from "../marketplace/client";
import { renderBuyerErrorPage } from "../marketplace/messages";
import type { MarketplaceStore } from "../marketplace/store";
import { PENDING_TTL_MS } from "../marketplace/store";
import env from "../config/env";

export interface MarketplaceSessionUser {
  id: string;
}

export interface MarketplaceControllerDeps {
  resolve: ResolveCustomerFn;
  store: MarketplaceStore;
  getSessionUser: (c: Context) => Promise<MarketplaceSessionUser | null>;
  log?: (event: string, data: Record<string, unknown>) => void;
}

const FORM_FIELD = "x-amzn-marketplace-token";
const PENDING_HASH_KEY = "mp";

/** Never log the token; this only reports whether one was present. */
export const tokenFingerprint = (token: string | undefined): string =>
  token ? `present:${token.length}` : "absent";

/** The SPA origin, without a trailing slash, as the redirect target. */
const webRoot = () => (env.WEB_ORIGIN ?? "").replace(/\/+$/, "");

/** Bounded shape check; expiry and single use are enforced by the store. */
const isPendingId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 64;

export function createMarketplaceController({ resolve, store, getSessionUser, log }: MarketplaceControllerDeps) {
  const logger = log ?? ((event, data) => console.error(`[marketplace] ${event}`, data));

  return {
    /**
     * AWS POSTs the fulfillment form here. Always answers with a redirect or a
     * readable page - never JSON, never a stack trace.
     */
    fulfillment: async (c: Context) => {
      const body = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>);
      const raw = body[FORM_FIELD];
      const token = typeof raw === "string" ? raw : undefined;

      if (!token) {
        logger("fulfillment_missing_token", { path: c.req.path, token: tokenFingerprint(token) });
        const page = renderBuyerErrorPage("missing_token");
        return c.html(page.body, page.status);
      }

      const resolved = await resolve(token);

      if (isResolveFailure(resolved)) {
        logger("fulfillment_failed", {
          kind: resolved.kind,
          errorName: resolved.errorName,
          token: tokenFingerprint(token),
        });
        const page = renderBuyerErrorPage(resolved.kind);
        return c.html(page.body, page.status);
      }

      const identifiers = {
        customerAwsAccountId: resolved.customerAwsAccountId,
        productCode: resolved.productCode,
        licenseArn: resolved.licenseArn,
      };

      // A cross-site POST carries no session cookie, so this usually falls back
      // to the pending-record path even when the buyer is already signed in.
      const user = await getSessionUser(c);
      if (user?.id) {
        const subscription = await store.upsertSubscription({ ...identifiers, userId: user.id });
        logger("fulfillment_attached", {
          userId: user.id,
          productCode: identifiers.productCode,
          customerAwsAccountId: identifiers.customerAwsAccountId,
        });
        return c.redirect(`${webRoot()}/`, 303);
      }

      const pending = await store.createPending(identifiers, PENDING_TTL_MS);
      logger("fulfillment_pending", {
        pendingId: pending.id,
        productCode: identifiers.productCode,
        customerAwsAccountId: identifiers.customerAwsAccountId,
      });
      // The id rides in the URL fragment: never sent to a server, never in a
      // Referer, single use, and it survives the redirect into the SPA.
      return c.redirect(`${webRoot()}/#${PENDING_HASH_KEY}=${pending.id}`, 303);
    },

    /** Called by the SPA once a session exists: attach the parked identifiers. */
    claim: async (c: Context) => {
      const user = await getSessionUser(c);
      if (!user?.id) {
        return c.json({ message: "Not signed in" }, 401);
      }

      const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
      const pendingId = (body as Record<string, unknown>)?.pending;
      if (!isPendingId(pendingId)) {
        return c.json(OK("Nothing to link", null));
      }

      const pending = await store.consumePending(pendingId);
      if (!pending) {
        logger("claim_pending_unusable", { userId: user.id, pendingId });
        return c.json(OK("Marketplace setup link expired", null));
      }

      const subscription = await store.upsertSubscription({
        customerAwsAccountId: pending.customerAwsAccountId,
        productCode: pending.productCode,
        licenseArn: pending.licenseArn,
        userId: user.id,
      });
      logger("claim_attached", {
        userId: user.id,
        productCode: pending.productCode,
        customerAwsAccountId: pending.customerAwsAccountId,
      });

      return c.json(OK("Marketplace subscription linked", subscription));
    },
  };
}
