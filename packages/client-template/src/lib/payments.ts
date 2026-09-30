/**
 * Gateway-agnostic online payment surface.
 * No live charge until a client plugs a provider adapter (Paymob, Fawry, etc.).
 */

export type PaymentProviderId =
  | "none"
  | "paymob"
  | "fawry"
  | "stripe"
  | "custom";

export type PaymentsConfig = {
  /** Master — when false, checkout stays cash-on-delivery / at table */
  enabled: boolean;
  /** Which adapter to use once credentials exist */
  provider: PaymentProviderId;
  /** Human note for ops / future wiring */
  note?: string;
};

export const DEFAULT_PAYMENTS: PaymentsConfig = {
  enabled: false,
  provider: "none",
  note: "Online payment ready to wire per client gateway — not active yet.",
};

export function normalizePayments(
  raw?: Partial<PaymentsConfig> | null
): PaymentsConfig {
  const provider = (raw?.provider || "none") as PaymentProviderId;
  const allowed: PaymentProviderId[] = [
    "none",
    "paymob",
    "fawry",
    "stripe",
    "custom",
  ];
  return {
    enabled: Boolean(raw?.enabled) && provider !== "none",
    provider: allowed.includes(provider) ? provider : "none",
    note: raw?.note ? String(raw.note).slice(0, 300) : DEFAULT_PAYMENTS.note,
  };
}

export type PaymentIntentInput = {
  orderCode: string;
  amount: number;
  currency: string;
  customer?: { phone?: string; name?: string };
  returnUrl?: string;
};

export type PaymentIntentResult =
  | { ok: true; redirectUrl: string; providerRef: string }
  | { ok: false; error: string; reason: "disabled" | "not_configured" | "error" };

export interface PaymentProvider {
  id: PaymentProviderId;
  /** Create a checkout session / payment key — not implemented until credentials exist */
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
}

class NoopProvider implements PaymentProvider {
  id: PaymentProviderId = "none";
  async createIntent(): Promise<PaymentIntentResult> {
    return {
      ok: false,
      error: "Online payment is not configured for this client",
      reason: "disabled",
    };
  }
}

/** Stub adapters — return not_configured until env/secrets are set per client. */
class StubProvider implements PaymentProvider {
  constructor(public id: PaymentProviderId) {}
  async createIntent(): Promise<PaymentIntentResult> {
    return {
      ok: false,
      error: `Provider "${this.id}" selected but credentials are not wired yet`,
      reason: "not_configured",
    };
  }
}

export function getPaymentProvider(cfg: PaymentsConfig): PaymentProvider {
  const n = normalizePayments(cfg);
  if (!n.enabled || n.provider === "none") return new NoopProvider();
  return new StubProvider(n.provider);
}

export function paymentsPublicSummary(cfg?: Partial<PaymentsConfig> | null) {
  const n = normalizePayments(cfg);
  return {
    enabled: n.enabled,
    provider: n.provider,
    ready: false as const,
    message:
      n.enabled && n.provider !== "none"
        ? "Gateway selected — awaiting client credentials"
        : "Pay on delivery / at cashier",
  };
}
