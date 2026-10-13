import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { productIdSchema } from "@/lib/validation";
import { requireAdmin, jsonError } from "@/lib/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) {
    return jsonError("Identificador no valido", 400);
  }

  const [deleted] = await db
    .delete(expenses)
    .where(eq(expenses.id, id))
    .returning();
  if (!deleted) return jsonError("Gasto no encontrado", 404);

  return NextResponse.json({ ok: true, id: deleted.id });
}