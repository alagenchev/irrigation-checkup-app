ALTER TABLE "site_drawings" DROP CONSTRAINT "site_drawings_site_uniq";--> statement-breakpoint
ALTER TABLE "site_drawings" ADD CONSTRAINT "site_drawings_site_uniq" UNIQUE("company_id","site_id");