import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 20);

const prefixes = {
  smsConnection: "smc",
  smsContact: "sct",
  smsMessage: "smsg",
  smsEvent: "sev",
  commerceConnection: "ecc",
  commerceQuote: "ecq",
  organization: "org",
  contact: "ct",
  meeting: "mtg",
  conversation: "cv",
  message: "msg",
  lead: "ld",
  stage: "stg",
  credentials: "cred",
  googleCredentials: "gcred",
  leadgenEvent: "lg",
  agentProfile: "agp",
  aiCreditEntry: "aic",
  kbEntry: "kb",
  template: "tpl",
  testRun: "run",
  testCase: "case",
  service: "svc",
  serviceForm: "sform",
  campaign: "cmp",
  campaignRecipient: "crp",
  notification: "ntf",
  emailDelivery: "eml",
  mailingSubscriber: "msu",
  mailingList: "mli",
  mailingListMember: "mlm",
  mailingProgram: "mpr",
  mailingEnrollment: "men",
  mailingSend: "mse",
  mailingEvent: "mev",
  contactReport: "crpt",
  webFormIntegration: "wfi",
  webFormSubmission: "wfs",
} as const;

export type IdKind = keyof typeof prefixes;

export function newId(kind: IdKind): string {
  return `${prefixes[kind]}_${nano()}`;
}
