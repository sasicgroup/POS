-- FIX RLS for sale_payments table
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sale_payments;
DROP POLICY IF EXISTS "Enable all access" ON public.sale_payments;

CREATE POLICY "Dev Access Sale Payments" ON public.sale_payments FOR ALL USING (true) WITH CHECK (true);
