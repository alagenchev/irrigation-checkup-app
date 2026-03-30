CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"account_type" text,
	"account_number" text,
	"created_at" timestamp with time zone DEFAULT now()
);
