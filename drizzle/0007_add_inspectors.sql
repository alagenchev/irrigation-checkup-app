CREATE TABLE "inspectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"license_num" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "site_visits" DROP CONSTRAINT "site_visits_technician_id_technicians_id_fk";
--> statement-breakpoint
ALTER TABLE "site_visits" ADD COLUMN "inspector_id" integer;
--> statement-breakpoint
ALTER TABLE "site_visits" DROP COLUMN "technician_id";
--> statement-breakpoint
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_inspector_id_inspectors_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."inspectors"("id") ON DELETE set null ON UPDATE no action;
