CREATE TABLE "site_backflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"manufacturer" text,
	"type" text,
	"model" text,
	"size" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_controllers" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"location" text,
	"manufacturer" text,
	"model" text,
	"sensors" text,
	"num_zones" text DEFAULT '0' NOT NULL,
	"master_valve" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_visits" (
	"site_visit_id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"client_id" integer,
	"technician_id" integer,
	"date_performed" date NOT NULL,
	"checkup_type" text DEFAULT 'Repair Checkup' NOT NULL,
	"account_type" text,
	"account_number" text,
	"status" text DEFAULT 'New' NOT NULL,
	"due_date" date,
	"repair_estimate" numeric(10, 2),
	"checkup_notes" text,
	"internal_notes" text,
	"static_pressure" numeric(6, 2),
	"backflow_installed" boolean DEFAULT false NOT NULL,
	"backflow_serviceable" boolean DEFAULT false NOT NULL,
	"isolation_valve" boolean DEFAULT false NOT NULL,
	"system_notes" text,
	"zone_issues" jsonb,
	"zone_notes" jsonb,
	"quote_items" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "site_visit_site_date_uniq" UNIQUE("site_id","date_performed")
);
--> statement-breakpoint
CREATE TABLE "site_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"controller_id" integer,
	"zone_num" text NOT NULL,
	"description" text,
	"landscape_types" text[],
	"irrigation_types" text[],
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "site_backflows" ADD CONSTRAINT "site_backflows_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_controllers" ADD CONSTRAINT "site_controllers_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_zones" ADD CONSTRAINT "site_zones_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_zones" ADD CONSTRAINT "site_zones_controller_id_site_controllers_id_fk" FOREIGN KEY ("controller_id") REFERENCES "public"."site_controllers"("id") ON DELETE set null ON UPDATE no action;