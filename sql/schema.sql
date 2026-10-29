-- ============================================================
--  Catalogo de Semillas - Esquema PostgreSQL
--  Compatible con Supabase, Neon y Vercel Postgres
-- ============================================================

-- Habilitar extension para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  Tabla de Productos (Semillas)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT true NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  Indices para optimizar velocidad de busqueda
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Indice para busqueda case-insensitive por nombre (ILIKE / trigram)
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(lower(name));

-- ============================================================
--  Trigger para actualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================
--  Row Level Security (defensa en profundidad, opcional)
--  El backend accede con el rol de servicio, que omite RLS.
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Lectura publica de productos (por si se usa el cliente anon de Supabase).
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read"
    ON products FOR SELECT
    USING (true);
