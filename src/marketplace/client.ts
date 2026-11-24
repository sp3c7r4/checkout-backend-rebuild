import {
  MarketplaceMeteringClient,
  ResolveCustomerCommand,
} from "@aws-sdk/client-marketplace-metering";
import env from "../config/env";

/** Everything the fulfillment flow needs to know about a failure. */
export type ResolveFailureKind =
  | "missing_token"
  | "expired_token"
  | "invalid_token"
  | "disabled_api"
  | "throttled"
  | "internal"
  | "product_mismatch"
  | "unknown";

export type ResolveResult =
  | {
      ok: true;
      customerAwsAccountId: string;
      productCode: string;
      licenseArn: string;
    }
  | { ok: false; kind: ResolveFailureKind; errorName?: string };

export type ResolveCustomerFn = (token: string) => Promise<ResolveResult>;

export const isResolveFailure = (result: ResolveResult): result is Extract<ResolveResult, { ok: false }> =>
  result.ok === false;

const RETRYABLE = new Set([
  "ThrottlingException",
  "TooManyRequestsException",
  "InternalServiceErrorException",
  "InternalFailure",
  "ServiceUnavailableException",
  "RequestTimeout",
]);

const ERROR_KINDS: Record<string, ResolveFailureKind> = {
  ExpiredTokenException: "expired_token",
  InvalidTokenException: "invalid_token",
  DisabledApiException: "disabled_api",
  ThrottlingException: "throttled",
  TooManyRequestsException: "throttled",
  InternalServiceErrorException: "internal",
  ServiceUnavailableException: "internal",
};

export function kindForErrorName(name: string | undefined): ResolveFailureKind {
  if (!name) return "unknown";
  return ERROR_KINDS[name] ?? "unknown";
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface MarketplaceResolverOptions {
  client?: MarketplaceMeteringClient;
  attempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** expected product code; defaults to AWS_MARKETPLACE_PRODUCT_CODE */
  expectedProductCode?: string;
}

/**
 * Resolves an AWS Marketplace registration token server-side.
 * Returns a result instead of throwing so callers never leak SDK errors to a buyer.
 */
export function createMarketplaceResolver(options: MarketplaceResolverOptions = {}): ResolveCustomerFn {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const sleep = options.sleep ?? defaultSleep;
  // Deployment uses the repo's AWS_ACCESS_KEY / AWS_SECRET_KEY names; the SDK's
  // default chain understands AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY and roles.
  const staticCredentials =
    env.AWS_ACCESS_KEY && env.AWS_SECRET_KEY
      ? { accessKeyId: env.AWS_ACCESS_KEY, secretAccessKey: env.AWS_SECRET_KEY }
      : undefined;

  const client =
    options.client ??
    new MarketplaceMeteringClient({
      region: env.AWS_MARKETPLACE_REGION,
      ...(staticCredentials ? { credentials: staticCredentials } : {}),
    });
  const expectedProductCode = options.expectedProductCode ?? env.AWS_MARKETPLACE_PRODUCT_CODE;

  return async (token: string): Promise<ResolveResult> => {
    if (!token || token.trim().length === 0) {
      return { ok: false, kind: "missing_token" };
    }

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await client.send(new ResolveCustomerCommand({ RegistrationToken: token }));

        const customerAwsAccountId = response.CustomerAWSAccountId;
        const productCode = response.ProductCode;
        const licenseArn = response.LicenseArn;

        if (!customerAwsAccountId || !productCode) {
          return { ok: false, kind: "unknown", errorName: "IncompleteResolveCustomerResponse" };
        }
        if (expectedProductCode && productCode !== expectedProductCode) {
          return { ok: false, kind: "product_mismatch", errorName: "ProductCodeMismatch" };
        }

        return { ok: true, customerAwsAccountId, productCode, licenseArn: licenseArn ?? "" };
      } catch (error: any) {
        const errorName: string | undefined = error?.name ?? error?.code ?? error?.Code;
        const retryable = RETRYABLE.has(errorName ?? "");

        if (retryable && attempt < attempts) {
          // exponential backoff with jitter; only transient failures are retried
          await sleep(baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 100));
          continue;
        }

        return { ok: false, kind: kindForErrorName(errorName), errorName };
      }
    }

    return { ok: false, kind: "unknown", errorName: "RetriesExhausted" };
  };
}
