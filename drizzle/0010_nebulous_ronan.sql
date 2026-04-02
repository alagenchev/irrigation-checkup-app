CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_org_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
ALTER TABLE "technicians" DROP CONSTRAINT "technicians_name_unique";--> statement-breakpoint
CREATE SEQUENCE "company_settings_id_seq";--> statement-breakpoint
ALTER TABLE "company_settings" ALTER COLUMN "id" SET DEFAULT nextval('"company_settings_id_seq"');--> statement-breakpoint
ALTER SEQUENCE "company_settings_id_seq" OWNED BY "company_settings"."id";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "inspectors" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "site_backflows" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "site_controllers" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "site_visits" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "site_zones" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspectors" ADD CONSTRAINT "inspectors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_backflows" ADD CONSTRAINT "site_backflows_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_controllers" ADD CONSTRAINT "site_controllers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_zones" ADD CONSTRAINT "site_zones_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_unique" UNIQUE("company_id");--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_company_name_uniq" UNIQUE("company_id","name");