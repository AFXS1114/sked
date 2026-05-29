-- Supabase SQL Migration Script (Updated)

-- 1. Clean up existing tables (Warning: This deletes existing data in these tables)
DROP TABLE IF EXISTS public.leaves CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;

-- 2. Create Tables
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone_number TEXT,
    position TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('duty', 'day_off')),
    UNIQUE(employee_id, work_date)
);

CREATE TABLE public.leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'absent'))
);

-- 3. Explicit Grants for Supabase's anon and authenticated roles
-- This explicitly grants table-level permissions, preventing "permission denied" errors.
GRANT ALL ON TABLE public.employees TO anon, authenticated;
GRANT ALL ON TABLE public.schedules TO anon, authenticated;
GRANT ALL ON TABLE public.leaves TO anon, authenticated;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Breaking "FOR ALL" into explicit SELECT, INSERT, UPDATE, DELETE policies is 
-- the most bulletproof way to configure access.

-- Employees Policies
CREATE POLICY "Allow anon select on employees" ON public.employees FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert on employees" ON public.employees FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update on employees" ON public.employees FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on employees" ON public.employees FOR DELETE TO anon, authenticated USING (true);

-- Schedules Policies
CREATE POLICY "Allow anon select on schedules" ON public.schedules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert on schedules" ON public.schedules FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update on schedules" ON public.schedules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on schedules" ON public.schedules FOR DELETE TO anon, authenticated USING (true);

-- Leaves Policies
CREATE POLICY "Allow anon select on leaves" ON public.leaves FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert on leaves" ON public.leaves FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update on leaves" ON public.leaves FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on leaves" ON public.leaves FOR DELETE TO anon, authenticated USING (true);
