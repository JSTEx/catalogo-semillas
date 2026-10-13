import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { toProductDTO } from "@/lib/types";
import CatalogClient from "@/components/CatalogClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  const rows = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt));

  return <CatalogClient initialProducts={rows.map(toProductDTO)} />;
}
