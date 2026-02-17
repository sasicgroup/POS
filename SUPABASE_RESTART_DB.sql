-- RESTART / REFRESH DATABASE CACHES & CONNECTIONS
-- Run this in Supabase SQL Editor to clear internal caches without deleting data.

-- 1. FORCE REPLANNING OF QUERIES
-- This clears prepared statements and cached query plans that might be stale.
DISCARD PLANS;
DISCARD SEQUENCES;
DISCARD TEMP;

-- 2. VACUUM (OPTIMIZE STORAGE & RECLAIM SPACE)
-- This physically reorganizes the table storage, often fixing "ghost" row issues.
VACUUM (VERBOSE, ANALYZE) public.products;

-- 3. REINDEX (REBUILD LOOKUP TREES)
-- If an index is corrupted, rows might exist but searches won't find them.
REINDEX TABLE public.products;

-- 4. UPDATE STATISTICS
-- Ensures the query planner knows how many rows there are.
ANALYZE VERBOSE public.products;

-- 5. NOTIFY CLIENTS TO RELOAD (If applicable)
NOTIFY "pgrst", 'reload schema';
