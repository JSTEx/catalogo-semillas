import { sql } from "drizzle-orm";
import { db } from "./db";
import { deleteImageByUrl } from "./storage";

/**
 * Indica si una imagen sigue referenciada por un producto, por el historial de
 * un pedido (items) o como comprobante de pago. Asi no rompemos pedidos viejos
 * ni imagenes compartidas al limpiar Storage.
 */
export async function isImageInUse(url: string): Promise<boolean> {
  const rows = await db.execute(sql`
    select 1 from products
    where image_url = ${url}
       or image_urls @> ${JSON.stringify([url])}::jsonb
    union all
    select 1 from orders
    where receipt_url = ${url}
       or items @> ${JSON.stringify([{ imageUrl: url }])}::jsonb
    limit 1
  `);
  return rows.length > 0;
}

/**
 * Borra del bucket las imagenes indicadas que ya no esten en uso. Se ejecuta
 * despues de la operacion principal; cualquier fallo se ignora para no afectar
 * al usuario.
 */
export async function deleteUnusedImages(urls: string[]): Promise<void> {
  for (const url of new Set(urls.filter(Boolean))) {
    try {
      if (await isImageInUse(url)) continue;
      await deleteImageByUrl(url);
    } catch (error) {
      console.error("[storage] no se pudo limpiar una imagen:", error);
    }
  }
}
