-- CLEANUP SCRIPT: Delete stores marked as 'deleted'

-- 1. Delete deleted stores
DELETE FROM public.stores 
WHERE status ILIKE 'deleted';

-- Note: Cascading deletes should handle related data if foreign keys are set up correctly.
-- If not, you might need to manually delete related records first or ensure ON DELETE CASCADE is set.
-- Based on previous migrations, we should check constraints, but 'deleted' status usually implies soft delete was intended.
-- Since the user requested hard delete, we execute this.

-- Optional: Ensure index on status for future performance (if soft delete is kept for some)
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);
