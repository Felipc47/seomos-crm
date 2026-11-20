import { sql, type SQL } from "drizzle-orm";
import { schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { usPhone } from "@/lib/sms";

/**
 * One atomic INSERT ... SELECT checks the tenant's explicit source attestation
 * and reserves the SMS contact. A previous SMS opt-out survives every later
 * Meta webhook or Sheets sync because the phone uniqueness conflict is ignored.
 */
export function smsLeadEnrollmentSql(input: {
  organizationId: string;
  sourceType: "meta_form" | "sheet";
  sourceKey: string;
  leadKey: string;
  contactId: string;
  phone: string;
  name: string;
}): SQL | null {
  const phone = usPhone(input.phone.startsWith("+") ? input.phone : `+${input.phone}`);
  if (!phone) return null; // SMS currently supports US numbers only.
  const prefix = `${input.sourceType === "meta_form" ? "Meta Lead Ads" : "Google Sheets/Meta"}; origen ${input.sourceKey}; lead ${input.leadKey}; `;
  return sql`
    insert into ${schema.smsContact} (id, organization_id, crm_contact_id, name, phone, consent_evidence, ai_enabled)
    select ${newId("smsContact")}, ${input.organizationId}, ${input.contactId}, ${input.name}, ${phone},
      left(${prefix} || ${schema.smsLeadSource.consentEvidence}, 1000), true
    from ${schema.smsLeadSource}
    where ${schema.smsLeadSource.organizationId} = ${input.organizationId}
      and ${schema.smsLeadSource.sourceType} = ${input.sourceType}
      and ${schema.smsLeadSource.sourceKey} = ${input.sourceKey}
    on conflict (organization_id, phone) do nothing
  `;
}
