import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { productIdSchema, updateOrderSchema } from "@/lib/validation";
import { requireAdmin, jsonError } from "@/lib/http";
import { holdsStock, releaseStock, reserveStock } from "@/lib/inventory";
import { deleteUnusedImages } from "@/lib/image-cleanup";
import { sendCustomerOrderEmail } from "@/lib/email";
import { toOrderDTO, toPublicOrderDTO, type OrderItem } from "@/lib/types";
import {
  HOME_DELIVERY_FEE_CENTS,
  isDeliveryCarrierId,
  quoteDeliveryCarrier,
} from "@/lib/delivery";

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
  if (parsed.data.shippingProviderId !== undefined) {
    if (guard.admin.role !== "superadmin") {
      return jsonError("Solo el superadmin puede ver y guardar costos de envío", 403);
    }
    if (existing.delivery !== "domicilio") {
      return jsonError("Este pedido no tiene envío a domicilio", 400);
    }
    if (parsed.data.shippingProviderId === null) {
      patch.shippingProviderId = null;
      patch.shippingProviderBaseCents = null;
      patch.shippingCommissionBps = null;
      patch.shippingCommissionCents = null;
    } else {
      if (!isDeliveryCarrierId(parsed.data.shippingProviderId)) {
        return jsonError("Empresa de envío no válida", 400);
      }
      const quote = quoteDeliveryCarrier(
        parsed.data.shippingProviderId,
        existing.totalCents,
        existing.payment === "efectivo",
      );
      patch.shippingProviderId = quote.carrierId;
      patch.shippingProviderBaseCents = quote.baseFeeCents;
      patch.shippingCommissionBps = quote.commissionBps;
      patch.shippingCommissionCents = quote.commissionCents;
    }
  }
  if (parsed.data.shippingCents !== undefined) {
    const fixedShipping =
      existing.delivery === "domicilio" ? HOME_DELIVERY_FEE_CENTS : 0;
    if (parsed.data.shippingCents !== fixedShipping) {
      return jsonError("El costo de envío es fijo para esta forma de entrega", 400);
    }
    patch.totalCents = existing.productsTotal + fixedShipping;
  }
  if (parsed.data.status !== undefined) {
    if (parsed.data.status === "delivered") {
      if (existing.status !== "delivered" || !existing.deliveredAt) {
        patch.deliveredAt = new Date();
      }
    } else {
      patch.deliveredAt = null;
    }
  }
  patch.updatedAt = new Date();

  const dto = await db
    .transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set(patch)
        .where(eq(orders.id, id))
        .returning();
      if (!updated) return null;

      if (existing.status !== updated.status) {
        const wasHolding = holdsStock(existing.status);
        const nowHolding = holdsStock(updated.status);
        if (wasHolding && !nowHolding) {
          await releaseStock(tx, updated.items as OrderItem[]);
        } else if (!wasHolding && nowHolding) {
          const reserved = await reserveStock(tx, updated.items as OrderItem[]);
          if (!reserved) throw new Error("STOCK_INSUFICIENTE");
        }
      }
      return toOrderDTO(updated, guard.admin.role === "superadmin");
    })
    .catch((err) => {
      if (err instanceof Error && err.message === "STOCK_INSUFICIENTE") {
        return "STOCK" as const;
      }
      throw err;
    });

  if (dto === null) return jsonError("Pedido no encontrado", 404);
  if (dto === "STOCK") {
    return jsonError(
      "No hay existencias suficientes para reactivar este pedido.",
      409,
    );
  }

  if (parsed.data.status && parsed.data.status !== existing.status) {
    after(() => sendCustomerOrderEmail(dto));
  }

  if (
    parsed.data.receiptUrl !== undefined &&
    existing.receiptUrl &&
    existing.receiptUrl !== dto.receiptUrl
  ) {
    after(() => deleteUnusedImages([existing.receiptUrl!]));
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

  const deleted = await db.transaction(async (tx) => {
    const [row] = await tx.delete(orders).where(eq(orders.id, id)).returning();
    if (row && holdsStock(row.status)) {
      await releaseStock(tx, row.items as OrderItem[]);
    }
    return row;
  });

  if (!deleted) return jsonError("Pedido no encontrado", 404);

  if (deleted.receiptUrl) {
    after(() => deleteUnusedImages([deleted.receiptUrl!]));
  }

  return NextResponse.json({ ok: true, id: deleted.id });
}