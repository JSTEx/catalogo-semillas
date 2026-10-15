import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { productIdSchema } from "@/lib/validation";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Estado (ligero) de varios pedidos a la vez, para el historial del cliente.
 * Solo expone el estado; el id es un UUID no adivinable.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = [
    ...new Set(
      (url.searchParams.get("ids") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];

  if (ids.length === 0) return NextResponse.json({ statuses: {} });
  if (ids.length > 50) return jsonError("Demasiados identificadores", 400);
  if (!ids.every((id) => productIdSchema.safeParse(id).success)) {
    return jsonError("Identificador no valido", 400);
  }

  const rows = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(inArray(orders.id, ids));

  const statuses: Record<string, string> = {};
  for (const r of rows) statuses[r.id] = r.status;

  return NextResponse.json({ statuses });
}
