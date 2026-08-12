export type MockEmail = {
  id: string;
  idempotencyKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};

type ResendMockState = {
  outbox: MockEmail[];
  failNext: number;
};

const globalForResend = globalThis as unknown as {
  __resendMockState?: ResendMockState;
};

export function getResendMockState(): ResendMockState {
  if (!globalForResend.__resendMockState) {
    globalForResend.__resendMockState = { outbox: [], failNext: 0 };
  }
  return globalForResend.__resendMockState;
}

export function resetResendMockState(): void {
  globalForResend.__resendMockState = { outbox: [], failNext: 0 };
}
