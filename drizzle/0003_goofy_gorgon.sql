CREATE TABLE "technicians" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "technicians_name_unique" UNIQUE("name")
);
