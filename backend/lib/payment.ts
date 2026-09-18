export interface PaymentAdapter {
  capture(input: { amount: number; method: string; idempotencyKey: string }): { provider: string; accountNumber: string; amount: number; status: "SUCCEEDED"; idempotencyKey: string; mode: "DEMO" };
}

export const demoPaymentAdapter: PaymentAdapter = {
  capture({ amount, method, idempotencyKey }) {
    if (!Number.isFinite(amount) || amount < 0) throw new Error("INVALID_SERVER_AMOUNT");
    return { provider: method, accountNumber: "DEMO", amount, status: "SUCCEEDED", idempotencyKey, mode: "DEMO" };
  },
};
