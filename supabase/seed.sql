-- Seed data for local development
-- Run after: supabase start && supabase db reset

insert into public.outlets (id, name, brand, address, status)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Gabru Di Chaap - Elan Miracle Mall',
    'Gabru Di Chaap',
    'Elan Miracle Mall, Sector 84, Gurugram, Haryana',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Wafflesome',
    'Wafflesome',
    null,
    'setup'
  );
