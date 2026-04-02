-- Make company_id the primary key for company_settings
-- (remove redundant id column)

ALTER TABLE "company_settings" DROP CONSTRAINT IF EXISTS "company_settings_pkey";--> statement-breakpoint
ALTER TABLE "company_settings" DROP CONSTRAINT IF EXISTS "company_settings_company_id_unique";--> statement-breakpoint
ALTER TABLE "company_settings" ADD PRIMARY KEY ("company_id");--> statement-breakpoint
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "id";
