import { NextResponse, after } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products } from "@/lib/db/schema";
import { createOrderSchema } from "@/lib/validation";
import { isSameOrigin, jsonError, getClientIp } from "@/lib/http";
import { checkOrderRateLimit } from "@/lib/rate-limit";
import { isOrderable } from "@/lib/orders";
import { reserveStock } from "@/lib/inventory";
import { sendNewOrderEmail, sendCustomerOrderEmail } from "@/lib/email";
import { toOrderDTO, type OrderItem } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return jsonError("Origen no permitido", 403);
  }

  const ip = getClientIp(req);
  const rl = await checkOrderRateLimit(`ip:${ip}`);
  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return jsonError(
      "Hiciste muchos pedidos seguidos. Espera unos minutos e intentalo de nuevo.",
      429,
      {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Cuerpo de la peticion invalido", 400);
  }

  const parsed = createOrderSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos invalidos", 400);
  }

  const ids = [...new Set(parsed.data.items.map((it) => it.productId))];
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  const byId = new Map(rows.map((p) => [p.id, p]));

  const items: OrderItem[] = [];
  let productsTotal = 0;

  for (const line of parsed.data.items) {
    const product = byId.get(line.productId);
    if (!product) {
      return jsonError("Uno de los productos ya no existe", 409);
    }
    if (!isOrderable(product)) {
      return jsonError(`"${product.name}" no esta disponible`, 409);
    }
    if (line.quantity > product.stock) {
      return jsonError(
        `"${product.name}" solo tiene ${product.stock} ${
          product.stock === 1 ? "unidad disponible" : "unidades disponibles"
        }`,
        409,
      );
    }
    const quantity = line.quantity;
    items.push({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      quantity,
    });
    productsTotal += product.priceCents * quantity;
  }

  const dto = await db.transaction(async (tx) => {
    const reserved = await reserveStock(tx, items);
    if (!reserved) return null;

    const [created] = await tx
      .insert(orders)
      .values({
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        customerEmail: parsed.data.customerEmail ?? null,
        notifyEmail: parsed.data.notifyEmail,
        delivery: parsed.data.delivery,
        address: parsed.data.address ?? null,
        payment: parsed.data.payment,
        notes: parsed.data.notes ?? null,
        items,
        productsTotal,
        shippingCents: 0,
        totalCents: productsTotal,
      })
      .returning();

    return toOrderDTO(created);
  });

  if (!dto) {
    return jsonError(
      "Uno de los productos ya no tiene existencias suficientes. Actualiza tu carrito.",
      409,
    );
  }

  after(async () => {
    await sendNewOrderEmail(dto);
    await sendCustomerOrderEmail(dto);
  });

  return NextResponse.json({ order: dto }, { status: 201 });
}