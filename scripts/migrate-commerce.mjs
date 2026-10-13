// Aplica columnas price/stock a products y crea las tablas orders y expenses.
// Uso: node --env-file=.env.local scripts/migrate-commerce.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => {},
});

const statements = [
  // products: precio en centavos y stock
  `ALTER TABLE products
     ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0`,

  // enums
  `DO $$ BEGIN CREATE TYPE order_status AS ENUM ('new','confirmed','in_transit','delivered','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('efectivo','transferencia'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE delivery_type AS ENUM ('retiro','domicilio'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE expense_category AS ENUM ('insumos','envio','empaque','publicidad','otros'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // orders
  `CREATE TABLE IF NOT EXISTS orders (
     id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
     number bigserial UNIQUE NOT NULL,
     customer_name text NOT NULL,
     customer_phone text NOT NULL,
     delivery delivery_type NOT NULL DEFAULT 'retiro',
     address text,
     payment payment_method NOT NULL DEFAULT 'efectivo',
     status order_status NOT NULL DEFAULT 'new',
     items jsonb NOT NULL,
     products_total integer NOT NULL DEFAULT 0,
     shipping_cents integer NOT NULL DEFAULT 0,
     total_cents integer NOT NULL DEFAULT 0,
     notes text,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)`,

  // expenses
  `CREATE TABLE IF NOT EXISTS expenses (
     id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
     concept text NOT NULL,
     category expense_category NOT NULL DEFAULT 'otros',
     amount_cents integer NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC)`,
];

for (const s of statements) {
  await sql.unsafe(s);
}
await sql.end();
console.log("Migracion de comercio aplicada correctamente.");