import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { auth } from "@/auth";
import { toOrderDTOList } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Pedidos vinculados a la cuenta del cliente autenticado. Permite verlos en
 * cualquier dispositivo, a diferencia del historial guardado en localStorage.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return NextResponse.json(
    { orders: toOrderDTOList(rows) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
