import { sql, type SQL } from "drizzle-orm";
import type { OrderStatus } from "./orders";
import type { OrderItem } from "./types";

/** Ejecutor SQL compatible tanto con `db` como con una transaccion `tx`. */
interface SqlRunner {
  execute: (query: SQL) => Promise<unknown>;
}

function rowCount(result: unknown): number {
  if (Array.isArray(result)) return result.length;
  if (result && typeof result === "object" && "count" in result) {
    const count = (result as { count?: unknown }).count;
    if (typeof count === "number") return count;
  }
  return 0;
}

/** Estados en los que el pedido mantiene stock reservado/descontado. */
export function holdsStock(status: OrderStatus): boolean {
  return status === "new" || status === "confirmed" || status === "in_transit" || status === "delivered";
}

/**
 * Descuenta existencias por cada articulo del pedido. Si algun producto ya no
 * tiene stock suficiente, no descuenta nada mas y devuelve false (el llamador
 * debe revertir la transaccion). Marca como agotado cuando llega a cero.
 */
export async function reserveStock(
  runner: SqlRunner,
  items: OrderItem[],
): Promise<boolean> {
  for (const item of items) {
    const result = await runner.execute(sql`
      UPDATE products
      SET stock = stock - ${item.quantity},
          status = CASE
            WHEN stock - ${item.quantity} <= 0 AND status IN ('available', 'low_stock')
              THEN 'out_of_stock'::product_status
            ELSE status
          END,
          updated_at = now()
      WHERE id = ${item.productId}
        AND stock >= ${item.quantity}
        AND is_hidden = false
      RETURNING id
    `);
    if (rowCount(result) === 0) return false;
  }
  return true;
}

/**
 * Devuelve existencias reservadas por un pedido cancelado. Reactiva el producto
 * solo si se habia agotado por ventas (stock en 0); si el administrador lo
 * marco como agotado manualmente pausando un producto con existencias, se
 * respeta ese estado.
 */
export async function releaseStock(
  runner: SqlRunner,
  items: OrderItem[],
): Promise<void> {
  for (const item of items) {
    await runner.execute(sql`
      UPDATE products
      SET stock = stock + ${item.quantity},
          status = CASE
            WHEN status = 'out_of_stock' AND stock = 0 THEN 'available'::product_status
            ELSE status
          END,
          updated_at = now()
      WHERE id = ${item.productId}
    `);
  }
}
