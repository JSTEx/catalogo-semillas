import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { productIdSchema, updateOrderSchema } from "@/lib/validation";
import { requireAdmin, jsonError } from "@/lib/http";
import { sendCustomerOrderEmail } from "@/lib/email";
import { toOrderDTO, toPublicOrderDTO } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Seguimiento publico del estado de un pedido (solo datos no sensibles).
 * El identificador es un UUID no adivinable.
 */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) {
    return jsonError("Identificador no valido", 400);
  }
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return jsonError("Pedido no encontrado", 404);
  return NextResponse.json({ order: toPublicOrderDTO(order) });
}

export async function PATCH(req: Request, { params }: Params) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) {
    return jsonError("Identificador no valido", 400);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Cuerpo de la peticion invalido", 400);
  }

  const parsed = updateOrderSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos invalidos", 400);
  }

  const [existing] = await db.select().from(orders).where(eq(orders.id, id));
  if (!existing) return jsonError("Pedido no encontrado", 404);

  const patch = { ...parsed.data } as Record<string, unknown>;
  if (parsed.data.shippingCents !== undefined) {
    patch.totalCents = existing.productsTotal + parsed.data.shippingCents;
  }
  patch.updatedAt = new Date();

  const [updated] = await db
    .update(orders)
    .set(patch)
    .where(eq(orders.id, id))
    .returning();

  const dto = toOrderDTO(updated);
  if (parsed.data.status && parsed.data.status !== existing.status) {
    after(() => sendCustomerOrderEmail(dto));
  }

  return NextResponse.json({ order: dto });
}

export async function DELETE(req: Request, { params }: Params) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) {
    return jsonError("Identificador no valido", 400);
  }

  const [deleted] = await db.delete(orders).where(eq(orders.id, id)).returning();
  if (!deleted) return jsonError("Pedido no encontrado", 404);

  return NextResponse.json({ ok: true, id: deleted.id });
}