ALTER TABLE "account_types" RENAME TO "customer_account_types";
--> statement-breakpoint
ALTER TABLE "customer_account_types" RENAME CONSTRAINT "account_types_company_id_companies_id_fk" TO "customer_account_types_company_id_companies_id_fk";
--> statement-breakpoint
ALTER INDEX "account_types_company_type_uniq" RENAME TO "customer_account_types_company_type_uniq";
