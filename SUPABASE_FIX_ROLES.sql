-- Fix Role Constraint ensuring it matches Frontend ('owner', 'manager', 'staff')

-- 1. Employees Table
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;

-- Normalize Data (Safe fallback to 'staff' if invalid)
UPDATE public.employees SET role = LOWER(role);
UPDATE public.employees SET role = 'staff' WHERE role IS NULL OR role NOT IN ('owner', 'manager', 'staff');

-- Re-add Constraint
ALTER TABLE public.employees 
ADD CONSTRAINT employees_role_check 
CHECK (role IN ('owner', 'manager', 'staff'));

-- 2. Employee Access Table
ALTER TABLE public.employee_access DROP CONSTRAINT IF EXISTS employee_access_role_check;

-- Normalize Data
UPDATE public.employee_access SET role = LOWER(role);
UPDATE public.employee_access SET role = 'staff' WHERE role IS NULL OR role NOT IN ('owner', 'manager', 'staff');

-- Re-add Constraint
ALTER TABLE public.employee_access 
ADD CONSTRAINT employee_access_role_check 
CHECK (role IN ('owner', 'manager', 'staff'));
