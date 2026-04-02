-- ============================================================
-- MIGRATION 0010: Convert all PKs/FKs to UUID + multi-tenancy
-- ============================================================

-- Step 1: Drop all FK constraints that reference integer PKs
ALTER TABLE "sites"            DROP CONSTRAINT "sites_client_id_clients_id_fk";
ALTER TABLE "site_controllers" DROP CONSTRAINT "site_controllers_site_id_sites_id_fk";
ALTER TABLE "site_zones"       DROP CONSTRAINT "site_zones_site_id_sites_id_fk";
ALTER TABLE "site_zones"       DROP CONSTRAINT "site_zones_controller_id_site_controllers_id_fk";
ALTER TABLE "site_backflows"   DROP CONSTRAINT "site_backflows_site_id_sites_id_fk";
ALTER TABLE "site_visits"      DROP CONSTRAINT "site_visits_site_id_sites_id_fk";
ALTER TABLE "site_visits"      DROP CONSTRAINT "site_visits_client_id_clients_id_fk";
ALTER TABLE "site_visits"      DROP CONSTRAINT "site_visits_inspector_id_inspectors_id_fk";
ALTER TABLE "site_visits"      DROP CONSTRAINT "site_visit_site_date_uniq";
ALTER TABLE "technicians"      DROP CONSTRAINT "technicians_name_unique";

-- Step 2: Add UUID PK columns to all tables
ALTER TABLE "clients"          ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "sites"            ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "technicians"      ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "inspectors"       ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "company_settings" ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "site_controllers" ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "site_zones"       ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "site_backflows"   ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "site_visits"      ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;

-- Step 3: Add UUID FK columns and populate from old integer FKs

-- sites.client_id → clients.id
ALTER TABLE "sites" ADD COLUMN "_client_id_uuid" uuid;
UPDATE "sites" s SET "_client_id_uuid" = c."_uuid" FROM "clients" c WHERE s."client_id" = c."id";

-- site_controllers.site_id → sites.id
ALTER TABLE "site_controllers" ADD COLUMN "_site_id_uuid" uuid;
UPDATE "site_controllers" sc SET "_site_id_uuid" = s."_uuid" FROM "sites" s WHERE sc."site_id" = s."id";

-- site_zones.site_id → sites.id, site_zones.controller_id → site_controllers.id
ALTER TABLE "site_zones" ADD COLUMN "_site_id_uuid" uuid;
ALTER TABLE "site_zones" ADD COLUMN "_controller_id_uuid" uuid;
UPDATE "site_zones" sz SET "_site_id_uuid" = s."_uuid" FROM "sites" s WHERE sz."site_id" = s."id";
UPDATE "site_zones" sz SET "_controller_id_uuid" = sc."_uuid" FROM "site_controllers" sc WHERE sz."controller_id" = sc."id";

-- site_backflows.site_id → sites.id
ALTER TABLE "site_backflows" ADD COLUMN "_site_id_uuid" uuid;
UPDATE "site_backflows" sb SET "_site_id_uuid" = s."_uuid" FROM "sites" s WHERE sb."site_id" = s."id";

-- site_visits.site_id, client_id, inspector_id
ALTER TABLE "site_visits" ADD COLUMN "_site_id_uuid" uuid;
ALTER TABLE "site_visits" ADD COLUMN "_client_id_uuid" uuid;
ALTER TABLE "site_visits" ADD COLUMN "_inspector_id_uuid" uuid;
UPDATE "site_visits" sv SET "_site_id_uuid" = s."_uuid" FROM "sites" s WHERE sv."site_id" = s."id";
UPDATE "site_visits" sv SET "_client_id_uuid" = c."_uuid" FROM "clients" c WHERE sv."client_id" = c."id";
UPDATE "site_visits" sv SET "_inspector_id_uuid" = i."_uuid" FROM "inspectors" i WHERE sv."inspector_id" = i."id";

-- Step 4: Drop old integer PKs and replace with UUID
ALTER TABLE "clients"          DROP CONSTRAINT "clients_pkey";
ALTER TABLE "clients"          DROP COLUMN "id";
ALTER TABLE "clients"          RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "clients"          ADD PRIMARY KEY ("id");

ALTER TABLE "sites"            DROP CONSTRAINT "sites_pkey";
ALTER TABLE "sites"            DROP COLUMN "id";
ALTER TABLE "sites"            RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "sites"            ADD PRIMARY KEY ("id");

ALTER TABLE "technicians"      DROP CONSTRAINT "technicians_pkey";
ALTER TABLE "technicians"      DROP COLUMN "id";
ALTER TABLE "technicians"      RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "technicians"      ADD PRIMARY KEY ("id");

ALTER TABLE "inspectors"       DROP CONSTRAINT "inspectors_pkey";
ALTER TABLE "inspectors"       DROP COLUMN "id";
ALTER TABLE "inspectors"       RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "inspectors"       ADD PRIMARY KEY ("id");

ALTER TABLE "company_settings" DROP CONSTRAINT "company_settings_pkey";
ALTER TABLE "company_settings" DROP COLUMN "id";
ALTER TABLE "company_settings" RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "company_settings" ADD PRIMARY KEY ("id");

ALTER TABLE "site_controllers" DROP CONSTRAINT "site_controllers_pkey";
ALTER TABLE "site_controllers" DROP COLUMN "id";
ALTER TABLE "site_controllers" RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "site_controllers" ADD PRIMARY KEY ("id");

ALTER TABLE "site_zones"       DROP CONSTRAINT "site_zones_pkey";
ALTER TABLE "site_zones"       DROP COLUMN "id";
ALTER TABLE "site_zones"       RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "site_zones"       ADD PRIMARY KEY ("id");

ALTER TABLE "site_backflows"   DROP CONSTRAINT "site_backflows_pkey";
ALTER TABLE "site_backflows"   DROP COLUMN "id";
ALTER TABLE "site_backflows"   RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "site_backflows"   ADD PRIMARY KEY ("id");

-- site_visits uses site_visit_id as PK column name
ALTER TABLE "site_visits"      DROP CONSTRAINT "site_visits_pkey";
ALTER TABLE "site_visits"      DROP COLUMN "site_visit_id";
ALTER TABLE "site_visits"      RENAME COLUMN "_uuid" TO "site_visit_id";
ALTER TABLE "site_visits"      ADD PRIMARY KEY ("site_visit_id");

-- Step 5: Drop old integer FK columns, rename UUID FK columns
ALTER TABLE "sites"            DROP COLUMN "client_id";
ALTER TABLE "sites"            RENAME COLUMN "_client_id_uuid" TO "client_id";

ALTER TABLE "site_controllers" DROP COLUMN "site_id";
ALTER TABLE "site_controllers" RENAME COLUMN "_site_id_uuid" TO "site_id";
ALTER TABLE "site_controllers" ALTER COLUMN "site_id" SET NOT NULL;

ALTER TABLE "site_zones"       DROP COLUMN "site_id";
ALTER TABLE "site_zones"       DROP COLUMN "controller_id";
ALTER TABLE "site_zones"       RENAME COLUMN "_site_id_uuid" TO "site_id";
ALTER TABLE "site_zones"       RENAME COLUMN "_controller_id_uuid" TO "controller_id";
ALTER TABLE "site_zones"       ALTER COLUMN "site_id" SET NOT NULL;

ALTER TABLE "site_backflows"   DROP COLUMN "site_id";
ALTER TABLE "site_backflows"   RENAME COLUMN "_site_id_uuid" TO "site_id";
ALTER TABLE "site_backflows"   ALTER COLUMN "site_id" SET NOT NULL;

ALTER TABLE "site_visits"      DROP COLUMN "site_id";
ALTER TABLE "site_visits"      DROP COLUMN "client_id";
ALTER TABLE "site_visits"      DROP COLUMN "inspector_id";
ALTER TABLE "site_visits"      RENAME COLUMN "_site_id_uuid" TO "site_id";
ALTER TABLE "site_visits"      RENAME COLUMN "_client_id_uuid" TO "client_id";
ALTER TABLE "site_visits"      RENAME COLUMN "_inspector_id_uuid" TO "inspector_id";
ALTER TABLE "site_visits"      ALTER COLUMN "site_id" SET NOT NULL;

-- Step 6: Create companies table
CREATE TABLE "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerk_org_id" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "companies_clerk_org_id_unique" UNIQUE("clerk_org_id")
);

-- Step 7: Add company_id UUID columns (nullable)
ALTER TABLE "clients"          ADD COLUMN "company_id" uuid;
ALTER TABLE "sites"            ADD COLUMN "company_id" uuid;
ALTER TABLE "technicians"      ADD COLUMN "company_id" uuid;
ALTER TABLE "inspectors"       ADD COLUMN "company_id" uuid;
ALTER TABLE "company_settings" ADD COLUMN "company_id" uuid;
ALTER TABLE "site_controllers" ADD COLUMN "company_id" uuid;
ALTER TABLE "site_zones"       ADD COLUMN "company_id" uuid;
ALTER TABLE "site_backflows"   ADD COLUMN "company_id" uuid;
ALTER TABLE "site_visits"      ADD COLUMN "company_id" uuid;

-- Step 8: Insert placeholder company and backfill all tables
-- The first org to log in will "claim" this row (see getRequiredCompanyId in lib/tenant.ts).
INSERT INTO "companies" ("clerk_org_id") VALUES ('__pending_claim__');

UPDATE "clients"          SET "company_id" = (SELECT "id" FROM "companies" WHERE "clerk_org_id" = '__pending_claim__');
UPDATE "sites"            SET "company_id" = (SELECT "id" FROM "companies" WHERE "clerk_org_id" = '__pending_claim__');
UPDATE "technicians"      SET "company_id" = (SELECT "id" FROM "companies" WHERE "clerk_org_id" = '__pending_claim__');
UPDATE "inspectors"       SET "company_id" = (SELECT "id" FROM "companies" WHERE "clerk_org_id" = '__pending_claim__');
UPDATE "company_settings" SET "company_id" = (SELECT "id" FROM "companies" WHERE "clerk_org_id" = '__pending_claim__');
UPDATE "site_controllers" SET "company_id" = (SELECT "id" FROM "companies" WHERE "clerk_org_id" = '__pending_claim__');
UPDATE "site_zones"       SET "company_id" = (SELECT "id" FROM "companies" WHERE "clerk_org_id" = '__pending_claim__');
UPDATE "site_backflows"   SET "company_id" = (SELECT "id" FROM "companies" WHERE "clerk_org_id" = '__pending_claim__');
UPDATE "site_visits"      SET "company_id" = (SELECT "id" FROM "companies" WHERE "clerk_org_id" = '__pending_claim__');

-- Step 9: Enforce NOT NULL on company_id
ALTER TABLE "clients"          ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "sites"            ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "technicians"      ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "inspectors"       ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "company_settings" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "site_controllers" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "site_zones"       ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "site_backflows"   ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "site_visits"      ALTER COLUMN "company_id" SET NOT NULL;

-- Step 10: Add FK constraints
-- Cross-table FKs (regular — existing data is consistent after the UUID mapping)
ALTER TABLE "sites" ADD CONSTRAINT "sites_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
ALTER TABLE "site_controllers" ADD CONSTRAINT "site_controllers_site_id_sites_id_fk"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE;
ALTER TABLE "site_zones" ADD CONSTRAINT "site_zones_site_id_sites_id_fk"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE;
ALTER TABLE "site_zones" ADD CONSTRAINT "site_zones_controller_id_site_controllers_id_fk"
  FOREIGN KEY ("controller_id") REFERENCES "site_controllers"("id") ON DELETE SET NULL;
ALTER TABLE "site_backflows" ADD CONSTRAINT "site_backflows_site_id_sites_id_fk"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE;
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_site_id_sites_id_fk"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT;
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_inspector_id_inspectors_id_fk"
  FOREIGN KEY ("inspector_id") REFERENCES "inspectors"("id") ON DELETE SET NULL;

-- company_id FKs (all rows now point to the __pending_claim__ company which exists)
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "inspectors" ADD CONSTRAINT "inspectors_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "site_controllers" ADD CONSTRAINT "site_controllers_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "site_zones" ADD CONSTRAINT "site_zones_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "site_backflows" ADD CONSTRAINT "site_backflows_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

-- Step 11: Unique constraints
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_unique" UNIQUE("company_id");
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_company_name_uniq" UNIQUE("company_id", "name");
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visit_site_date_uniq" UNIQUE("site_id", "date_performed");
