-- 1. Add business_id to isolation-critical tables
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- 2. Backfill business_id from stores table where missing
UPDATE activity_logs al
SET business_id = s.business_id
FROM stores s
WHERE al.store_id = s.id AND al.business_id IS NULL;

UPDATE notifications n
SET business_id = s.business_id
FROM stores s
WHERE n.store_id = s.id AND n.business_id IS NULL;

UPDATE customers c
SET business_id = s.business_id
FROM stores s
WHERE c.store_id = s.id AND c.business_id IS NULL;

-- 3. Update existing employees without business_id
UPDATE employees e
SET business_id = s.business_id
FROM stores s
WHERE e.store_id = s.id AND e.business_id IS NULL;
