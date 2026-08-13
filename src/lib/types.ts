/** DTOs que viajan por la API interna (lado cliente). */

export type LeadAssignmentDto = {
  service: { id: string; name: string } | null;
  assignee: { memberId: string; name: string } | null;
};

export type InboxAssigneeOptionDto = {
  memberId: string;
  name: string;
  role: string;
  isCurrent: boolean;
};

export type ConversationDto = {
  id: string;
  contact: {
    id: string;
    name: string;
    phone: string;
    blockedAt: string | null;
    blockSyncStatus: "synced" | "failed" | null;
    reportedAt: string | null;
    reportReason: ContactReportReason | null;
  };
  stageName: string | null;
  aiEnabled: boolean;
  handoffAt: string | null;
  handoffReason: string | null;
  lastInboundAt: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  windowOpen: boolean;
  windowRemainingMs: number;
  preview: string | null;
  pinnedAt: string | null;
  archivedAt: string | null;
  service: LeadAssignmentDto["service"];
  assignee: LeadAssignmentDto["assignee"];
};

export type ContactReportReason =
  | "spam"
  | "harassment"
  | "fraud"
  | "inappropriate"
  | "other";

export type MessageDto = {
  id: string;
  conversationId: string;
  direction: "in" | "out";
  type: string;
  text: string | null;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  error: string | null;
  aiGenerated: boolean;
  createdAt: string;
  hasMedia: boolean;
  mediaMime: string | null;
  mediaFilename: string | null;
};

/** Fuente de una variable de plantilla (018). */
export type TemplateVariableSourceDto =
  | "first_name"
  | "name"
  | "phone"
  | "email"
  | "notes"
  | "service"
  | "stage"
  | "fixed";

export type TemplateVariableDto = {
  source: TemplateVariableSourceDto;
  value?: string | null;
  fallback?: string | null;
};

/** Etiquetas en español de las fuentes (compartidas por las UIs). */
export const TEMPLATE_VARIABLE_LABELS: Record<TemplateVariableSourceDto, string> =
  {
    first_name: "Primer nombre",
    name: "Nombre completo",
    phone: "Teléfono",
    email: "Correo",
    notes: "Notas del contacto",
    service: "Servicio del lead",
    stage: "Etapa del prospecto",
    fixed: "Valor fijo",
  };

export type TemplateDto = {
  id: string;
  name: string;
  language: string;
  category: string;
  body: string;
  status: "draft" | "awaiting_approval" | "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  /** Encabezado multimedia (016): null = plantilla solo de texto. */
  headerKind: "image" | "document" | null;
  headerFilename: string | null;
  /** Mapeo de variables (018): null = plantilla legacy (≤1 variable). */
  variables: TemplateVariableDto[] | null;
};

/** Kinds de etapa: las cuatro distintas de `open` son anclas del sistema. */
export type StageKind =
  | "open"
  | "scheduled"
  | "won"
  | "unqualified"
  | "lost";

export type StageDto = {
  id: string;
  name: string;
  position: number;
  kind: StageKind;
};

export type DashboardRangePreset =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "custom";

export type DashboardBreakdownDto = {
  id: string | null;
  name: string;
  count: number;
  wonCount: number;
  percentage: number;
};

export type DashboardMetricsDto = {
  range: {
    preset: DashboardRangePreset;
    from: string;
    to: string;
    timezone: string;
  };
  summary: {
    newLeads: number;
    activeOpportunities: number;
    meetings: number;
    wonLeads: number;
    conversionRate: number;
    unassignedLeads: number;
  };
  funnel: Array<{
    id: string;
    name: string;
    position: number;
    kind: StageKind;
    count: number;
    percentage: number;
  }>;
  trend: Array<{
    date: string;
    leads: number;
    meetings: number;
  }>;
  services: DashboardBreakdownDto[];
  assignees: DashboardBreakdownDto[];
  generatedAt: string;
};

export type ContactDto = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  /** Ficha extraída por IA de la conversación (se regenera, no se acumula). */
  aiProfile?: LeadProfileDto | null;
  aiProfileAt?: string | null;
  archivedAt: string | null;
  /** Cumplimiento de la política de Meta (006). */
  optedOutAt?: string | null;
  optedOutReason?: string | null;
  consentSource?:
    | "meta_lead_ads"
    | "inbound_message"
    | "manual"
    | "imported"
    | "web_form"
    | null;
  consentGrantedAt?: string | null;
  /** Etapa del lead del contacto (solo lectura; listado de Contactos). */
  stage?: {
    name: string;
    kind: StageKind;
    position: number;
  } | null;
  service?: LeadAssignmentDto["service"];
  assignee?: LeadAssignmentDto["assignee"];
};

export type LeadProfileDto = {
  contactName?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  needs: string[];
  budget?: string | null;
  timeline?: string | null;
  summary?: string | null;
};

export type WebFormIntegrationDto = {
  id: string;
  name: string;
  serviceId: string | null;
  serviceName: string | null;
  enabled: boolean;
  secretLast4: string;
  endpoint: string;
  lastUsedAt: string | null;
  lastStatus: "success" | "duplicate" | "failed" | null;
  lastError: string | null;
  createdAt: string;
};

/** Envío masivo (005). */
export type CampaignProgressDto = {
  total: number;
  pending: number;
  sent: number;
  failed: number;
};

export type CampaignStatus =
  | "draft"
  | "running"
  | "paused"
  | "done"
  | "failed";

export type CampaignDto = {
  id: string;
  name: string;
  status: CampaignStatus;
  templateName: string;
  variableMode: "none" | "contact_name" | "fixed";
  error: string | null;
  createdAt: string;
  progress: CampaignProgressDto;
};

export type CampaignRecipientDto = {
  id: string;
  status: "pending" | "sent" | "failed";
  error: string | null;
  contactName: string;
  contactPhone: string;
};

export type AudienceFilterDto =
  | { mode: "all" }
  | { mode: "stages"; stageIds: string[] }
  | { mode: "services"; serviceIds: string[] }
  /** Condiciones combinadas: dentro de cada dimensión es "cualquiera de";
   * entre dimensiones es "Y" (p. ej. Desarrollo web Y etapa Interesado). */
  | { mode: "filtered"; stageIds?: string[]; serviceIds?: string[] }
  | { mode: "manual"; contactIds: string[] };
