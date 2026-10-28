export type BrevoMock = { sends: { recipient: string; content: string; tag: string; messageId: number }[];
  next: string; earlyDelivery: boolean; hook: { url: string; headers: { key: string; value: string }[] } | null };
const globalMock = globalThis as unknown as { __brevoSmsMock?: BrevoMock };
export function brevoMock() { return globalMock.__brevoSmsMock ??= { sends: [], next: "", earlyDelivery: false, hook: null }; }
