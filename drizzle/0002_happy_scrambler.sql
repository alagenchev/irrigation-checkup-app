CREATE TABLE "company_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"license_num" text DEFAULT '' NOT NULL,
	"company_address" text DEFAULT '' NOT NULL,
	"company_city_state_zip" text DEFAULT '' NOT NULL,
	"company_phone" text DEFAULT '' NOT NULL,
	"performed_by" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
