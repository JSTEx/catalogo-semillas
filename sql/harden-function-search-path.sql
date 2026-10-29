-- Prevent objects in caller-controlled schemas from shadowing names used by
-- this trigger function.
ALTER FUNCTION public.set_updated_at() SET search_path = '';
