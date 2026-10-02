-- Create equipments table
CREATE TABLE IF NOT EXISTS public.equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  total_quantity INTEGER NOT NULL DEFAULT 0,
  borrowed_quantity INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'Baik',
  pic TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access for all users" ON public.equipments FOR ALL USING (true);
