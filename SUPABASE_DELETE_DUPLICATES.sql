-- Delete duplicate stores requested by user
-- Deletes any store with name containing 'SASIC HOME CARE' (case-insensitive)
DELETE FROM public.stores 
WHERE name ILIKE '%SASIC HOME CARE%';
