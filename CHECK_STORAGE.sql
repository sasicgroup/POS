-- CHECK STORAGE CONFIGURATION

-- 1. Check if bucket exists
select * from storage.buckets where id = 'product-images';

-- 2. Check policies on storage.objects
select * from pg_policies where tablename = 'objects' and schemaname = 'storage';
