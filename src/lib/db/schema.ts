import {
  index,
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

export type AdminUser = typeof adminUsers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
