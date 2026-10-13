import {
  bigserial,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const productStatusEnum = pgEnum("product_status", [
  "available",
  "low_stock",
  "out_of_stock",
  "coming_soon",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "new",
  "confirmed",
  "in_transit",
  "delivered",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "efectivo",
  "transferencia",
]);

export const deliveryTypeEnum = pgEnum("delivery_type", [
  "retiro",
  "domicilio",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "insumos",
  "envio",
  "empaque",
  "publicidad",
  "otros",
]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    name: varchar("name", { length: 100 }).notNull(),
    status: productStatusEnum("status").default("available").notNull(),
    imageUrl: text("image_url").notNull(),
    priceCents: integer("price_cents").default(0).notNull(),
    stock: integer("stock").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_products_status").on(table.status),
    index("idx_products_name").on(table.name),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    number: bigserial("number", { mode: "number" }).unique().notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    delivery: deliveryTypeEnum("delivery").default("retiro").notNull(),
    address: text("address"),
    payment: paymentMethodEnum("payment").default("efectivo").notNull(),
    status: orderStatusEnum("status").default("new").notNull(),
    items: jsonb("items").notNull(),
    productsTotal: integer("products_total").default(0).notNull(),
    shippingCents: integer("shipping_cents").default(0).notNull(),
    totalCents: integer("total_cents").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_orders_status").on(table.status),
    index("idx_orders_created_at").on(table.createdAt),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    concept: text("concept").notNull(),
    category: expenseCategoryEnum("category").default("otros").notNull(),
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_expenses_created_at").on(table.createdAt)],
);

export type AdminUser = typeof adminUsers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
