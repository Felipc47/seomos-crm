ALTER TABLE "sms_contact" ADD COLUMN "crm_contact_id" text;--> statement-breakpoint
ALTER TABLE "sms_contact" ADD CONSTRAINT "sms_contact_crm_contact_id_contact_id_fk" FOREIGN KEY ("crm_contact_id") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
UPDATE "sms_contact" AS sms
SET "crm_contact_id" = crm.id
FROM "contact" AS crm
WHERE sms."crm_contact_id" IS NULL
  AND sms."organization_id" = crm."organization_id"
  AND sms.phone = '+' || crm.phone;
