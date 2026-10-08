export type MockEmail = {
  id: string;
  idempotencyKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  reply_to?: string;
  tags?: { name: string; value: string }[];
};

type ResendMockState = {
  outbox: MockEmail[];
  failNext: number;
  statusNext: number;
  malformedNext: number;
  domainVerified: boolean;
  domains: { id: string; name: string; status: string; records: import("@/lib/mailing").DnsRecord[] }[];
};

const globalForResend = globalThis as unknown as {
  __resendMockState?: ResendMockState;
};

export function getResendMockState(): ResendMockState {
  if (!globalForResend.__resendMockState) {
    globalForResend.__resendMockState = { outbox: [], failNext: 0, statusNext: 0, malformedNext: 0, domainVerified: false, domains: [] };
  }
  return globalForResend.__resendMockState;
}

export function resetResendMockState(): void {
  globalForResend.__resendMockState = { outbox: [], failNext: 0, statusNext: 0, malformedNext: 0, domainVerified: false, domains: [] };
}
