import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, orders, products } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  toProductDTO,
  toOrderDTOList,
  toExpenseDTOList,
} from "@/lib/types";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  // Defensa en profundidad: el middleware ya protege esta ruta.
  const session = await getSession();
  if (!session) redirect("/admin/login");

  // Consultas secuenciales: el pool tiene max:1 y las consultas concurrentes
  // (Promise.all) pueden bloquear la unica conexion en el runtime de Next.
  const productRows = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt));
  const orderRows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(300);
  const expenseRows = await db
    .select()
    .from(expenses)
    .orderBy(desc(expenses.createdAt))
    .limit(500);

  return (
    <AdminDashboard
      initialProducts={productRows.map(toProductDTO)}
      initialOrders={toOrderDTOList(orderRows)}
      initialExpenses={toExpenseDTOList(expenseRows)}
      username={session.username}
    />
  );
}
