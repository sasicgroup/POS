-- Add receipt_number column to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_sales_receipt_number ON public.sales(receipt_number);

-- Backfill Receipt Numbers for existing sales
-- This ensures all historical sales have a proper sequential number based on store settings
DO $$
DECLARE
    r RECORD;
    s_rec RECORD;
    counter INT;
    prefix TEXT;
    suffix TEXT;
    formatted_num TEXT;
    max_counter INT;
BEGIN
    FOR s_rec IN SELECT id, receipt_prefix, receipt_suffix, last_transaction_number FROM public.stores LOOP
        -- Init settings
        prefix := COALESCE(s_rec.receipt_prefix, 'TRX');
        suffix := COALESCE(s_rec.receipt_suffix, '');
        
        counter := 0;
        
        -- Iterate sales by date to assign sequential numbers
        FOR r IN SELECT id FROM public.sales WHERE store_id = s_rec.id ORDER BY created_at ASC LOOP
            counter := counter + 1;
            
            formatted_num := prefix || LPAD(counter::text, 5, '0') || suffix;
            
            -- Only update if null to avoid overwriting if run multiple times
            UPDATE public.sales 
            SET receipt_number = formatted_num 
            WHERE id = r.id AND receipt_number IS NULL;
        END LOOP;
        
        -- Sync the store's last_transaction_number if our counted sales are higher
        -- This ensures the NEXT sale will continue the sequence correctly
        IF counter > s_rec.last_transaction_number THEN
            UPDATE public.stores SET last_transaction_number = counter WHERE id = s_rec.id;
        END IF;
    END LOOP;
END $$;
