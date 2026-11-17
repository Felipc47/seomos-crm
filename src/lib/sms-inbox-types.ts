import type { SmsStatus } from "@/lib/sms";

export type SmsInboxContact = {
  id: string;
  name: string;
  phone: string;
  optedOutAt: string | null;
  aiEnabled: boolean;
  createdAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

export type SmsInboxMessage = {
  id: string;
  direction: "in" | "out";
  source: "manual" | "agent" | "automation";
  content: string;
  status: SmsStatus;
  createdAt: string;
};

export type SmsInboxSnapshot = {
  contacts: SmsInboxContact[];
  messages: SmsInboxMessage[];
  connection: {
    sender: string | null;
    deliveryEnabled: boolean;
    smsCredits: number | null;
    webhookReady: boolean;
  } | null;
};
