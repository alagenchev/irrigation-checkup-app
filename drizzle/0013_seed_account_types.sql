-- Seed default account types for all companies
INSERT INTO account_types (company_id, type)
SELECT id, type FROM (
  SELECT c.id, unnest(ARRAY['Commercial', 'Residential', 'Industrial', 'Government', 'Non-Profit']) as type
  FROM companies c
) seeding
ON CONFLICT (company_id, type) DO NOTHING;
