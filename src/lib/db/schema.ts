import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

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
    category: varchar("category", { length: 40 }).default("otros").notNull(),
    description: text("description"),
    status: productStatusEnum("status").default("available").notNull(),
    imageUrl: text("image_url").notNull(),
    imageUrls: jsonb("image_urls")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
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
    index("idx_products_category").on(table.category),
  ],
);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  email: varchar("email", { length: 254 }).unique().notNull(),
  name: text("name"),
  image: text("image"),
  phone: text("phone"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    number: bigserial("number", { mode: "number" }).unique().notNull(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    notifyEmail: boolean("notify_email").default(false).notNull(),
    delivery: deliveryTypeEnum("delivery").default("retiro").notNull(),
    address: text("address"),
    payment: paymentMethodEnum("payment").default("efectivo").notNull(),
    status: orderStatusEnum("status").default("new").notNull(),
    items: jsonb("items").notNull(),
    productsTotal: integer("products_total").default(0).notNull(),
    shippingCents: integer("shipping_cents").default(0).notNull(),
    totalCents: integer("total_cents").default(0).notNull(),
    notes: text("notes"),
    receiptUrl: text("receipt_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_orders_status").on(table.status),
    index("idx_orders_created_at").on(table.createdAt),
    index("idx_orders_delivered_at").on(table.deliveredAt),
    index("idx_orders_customer_id").on(table.customerId),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    concept: text("concept").notNull(),
    category: expenseCategoryEnum("category").default("otros").notNull(),
    amountCents: integer("amount_cents").notNull(),
    imageUrl: text("image_url"),
    imageUrls: jsonb("image_urls")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_expenses_created_at").on(table.createdAt)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export type AdminUser = typeof adminUsers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
