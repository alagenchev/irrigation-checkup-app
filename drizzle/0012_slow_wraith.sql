CREATE TABLE "account_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "account_types_company_type_uniq" UNIQUE("company_id","type")
);
--> statement-breakpoint
ALTER TABLE "account_types" ADD CONSTRAINT "account_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;