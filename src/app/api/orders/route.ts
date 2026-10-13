import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products } from "@/lib/db/schema";
import { createOrderSchema } from "@/lib/validation";
import { isSameOrigin, jsonError } from "@/lib/http";
import { isOrderable } from "@/lib/orders";
import { toOrderDTO, type OrderItem } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return jsonError("Origen no permitido", 403);
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

  const [created] = await db
    .insert(orders)
    .values({
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
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

  return NextResponse.json({ order: toOrderDTO(created) }, { status: 201 });
}