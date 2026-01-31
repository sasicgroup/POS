-- ========================================
-- ULTIMATE FIX STORAGE PERMISSIONS
-- ========================================

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop legacy policies specifically for this bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
DROP POLICY IF EXISTS "Anyone Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Full Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;

-- 3. Create a SINGLE, PERMISSIVE Policy for this bucket
-- Allows EVERYONE (Auth + Anon) to SELECT, INSERT, UPDATE, DELETE
-- restricted ONLY by the bucket_id.
CREATE POLICY "Universal Access Product Images"
ON storage.objects
FOR ALL
USING ( bucket_id = 'product-images' )
WITH CHECK ( bucket_id = 'product-images' );

-- 4. Verify it's working
-- (You cannot verify from SQL easily, but this policy is bulletproof for RLS)
