import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { toProductDTO } from "@/lib/types";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Defensa en profundidad: el middleware ya protege esta ruta.
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const rows = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt));

  return (
    <AdminDashboard
      initialProducts={rows.map(toProductDTO)}
      username={session.username}
    />
  );
}
