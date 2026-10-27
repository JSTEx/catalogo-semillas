import { NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { productIdSchema } from "@/lib/validation";
import { isSameOrigin, jsonError, getClientIp } from "@/lib/http";
import { checkCancelRateLimit } from "@/lib/rate-limit";
import { releaseStock } from "@/lib/inventory";
import { sendCustomerOrderEmail, sendOrderCancelledEmail } from "@/lib/email";
import { toOrderDTO, toPublicOrderDTO, type OrderItem } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const cancelSchema = z.object({
  phone: z.string().trim().min(7, "Escribe tu telefono").max(20),
});

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Cancelacion del pedido por parte del cliente.
 * Solo se permite mientras el pedido esta en estado "nuevo" (el negocio aun no
 * lo ha confirmado/preparado). Requiere confirmar el telefono del pedido.
 */
export async function POST(req: Request, { params }: Params) {
  if (!isSameOrigin(req)) {
    return jsonError("Origen no permitido", 403);
  }

  const ip = getClientIp(req);
  const rl = await checkCancelRateLimit(`ip:${ip}`);
  if (!rl.success) {
    return jsonError(
      "Demasiados intentos. Espera unos minutos e intentalo de nuevo.",
      429,
    );
  }

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

  const parsed = cancelSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Escribe tu telefono para confirmar",
      400,
    );
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return jsonError("Pedido no encontrado", 404);

  if (order.status !== "new") {
    return jsonError(
      "Este pedido ya no se puede cancelar aqui. Escribenos por WhatsApp.",
      409,
    );
  }

  const input = digits(parsed.data.phone);
  const stored = digits(order.customerPhone);
  const matches =
    Math.min(input.length, stored.length) >= 7 &&
    (input.endsWith(stored) || stored.endsWith(input));
  if (!matches) {
    return jsonError("El telefono no coincide con el del pedido", 403);
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.status, "new")))
      .returning();
    if (!row) return null;
    await releaseStock(tx, row.items as OrderItem[]);
    return row;
  });

  if (!updated) {
    return jsonError(
      "Este pedido ya no se puede cancelar aqui. Escribenos por WhatsApp.",
      409,
    );
  }

  const dto = toOrderDTO(updated);
  after(async () => {
    await Promise.allSettled([
      sendCustomerOrderEmail(dto),
      sendOrderCancelledEmail(dto),
    ]);
  });

  return NextResponse.json({ order: toPublicOrderDTO(updated) });
}
