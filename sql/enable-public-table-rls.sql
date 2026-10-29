-- Enable RLS on tables exposed in Supabase's public schema.
-- No client-facing policies are created, so anon/authenticated API roles are
-- denied access by default. The trusted server connects with its database
-- owner/service role and continues to access these tables.
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.allowed_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;

-- Products remain publicly readable via the existing products_public_read policy.
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
