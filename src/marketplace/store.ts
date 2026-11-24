import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import { marketplacePending, marketplaceSubscription } from "../db/schema";

export interface ResolvedIdentifiers {
  customerAwsAccountId: string;
  productCode: string;
  licenseArn: string;
}

export interface MarketplaceStore {
  upsertSubscription(input: ResolvedIdentifiers & { userId?: string | null }): Promise<any>;
  createPending(input: ResolvedIdentifiers, ttlMs: number): Promise<{ id: string; expiresAt: Date }>;
  consumePending(id: string): Promise<(ResolvedIdentifiers & { id: string }) | null>;
  findForUser(userId: string): Promise<any[]>;
}

export const PENDING_TTL_MS = 15 * 60 * 1000;

export const drizzleMarketplaceStore: MarketplaceStore = {
  async upsertSubscription({ userId, customerAwsAccountId, productCode, licenseArn }) {
    // unique (customer_aws_account_id, product_code): re-delivery updates, never duplicates
    const [row] = await db
      .insert(marketplaceSubscription)
      .values({
        user_id: userId ?? null,
        customer_aws_account_id: customerAwsAccountId,
        product_code: productCode,
        license_arn: licenseArn || null,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [marketplaceSubscription.customer_aws_account_id, marketplaceSubscription.product_code],
        set: {
          license_arn: licenseArn || null,
          status: "active",
          updated_at: new Date(),
          // never detach an existing owner on an anonymous re-delivery
          ...(userId ? { user_id: userId } : {}),
        },
      })
      .returning();
    return row;
  },

  async createPending({ customerAwsAccountId, productCode, licenseArn }, ttlMs) {
    const expiresAt = new Date(Date.now() + ttlMs);
    const [row] = await db
      .insert(marketplacePending)
      .values({
        customer_aws_account_id: customerAwsAccountId,
        product_code: productCode,
        license_arn: licenseArn || null,
        expires_at: expiresAt,
      })
      .returning();
    return { id: row.id, expiresAt };
  },

  async consumePending(id) {
    const now = new Date();
    const [row] = await db
      .update(marketplacePending)
      .set({ consumed_at: now })
      .where(
        and(
          eq(marketplacePending.id, id),
          isNull(marketplacePending.consumed_at),
          gt(marketplacePending.expires_at, now)
        )
      )
      .returning();

    if (!row) return null;
    return {
      id: row.id,
      customerAwsAccountId: row.customer_aws_account_id,
      productCode: row.product_code,
      licenseArn: row.license_arn ?? "",
    };
  },

  async findForUser(userId) {
    return db.select().from(marketplaceSubscription).where(eq(marketplaceSubscription.user_id, userId));
  },
};
