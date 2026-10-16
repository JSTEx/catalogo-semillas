import { z } from "zod";
import { PRODUCT_STATUSES } from "./product-status";

/**
 * Elimina etiquetas HTML y caracteres de control para mitigar XSS en la capa
 * de entrada (defensa en profundidad; React ya escapa la salida).
 */
export function sanitizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

const sanitizedString = (min: number, max: number, label: string) =>
  z
    .string({ required_error: `${label} es obligatorio` })
    .transform(sanitizeText)
    .refine((v) => v.length >= min, {
      message: `${label} debe tener al menos ${min} caracteres`,
    })
    .refine((v) => v.length <= max, {
      message: `${label} no puede superar ${max} caracteres`,
    });

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Usuario demasiado corto")
    .max(50, "Usuario demasiado largo")
    .regex(/^[a-zA-Z0-9._-]+$/, "Usuario contiene caracteres no validos"),
  password: z
    .string()
    .min(8, "La contrasena debe tener al menos 8 caracteres")
    .max(100, "La contrasena es demasiado larga"),
});

export const imageUrlSchema = z
  .string()
  .trim()
  .url("La URL de la imagen no es valida")
  .max(2048, "URL de imagen demasiado larga")
  .refine((v) => v.startsWith("https://"), "La imagen debe usar HTTPS");

export const MAX_PRODUCT_IMAGES = 8;

/** Galeria de un producto: entre 1 y 8 imagenes, sin repetidas. */
export const imageUrlsSchema = z
  .array(imageUrlSchema)
  .min(1, "Agrega al menos una imagen")
  .max(MAX_PRODUCT_IMAGES, `Maximo ${MAX_PRODUCT_IMAGES} imagenes por producto`)
  .refine((urls) => new Set(urls).size === urls.length, {
    message: "No repitas la misma imagen",
  });

const categorySchema = sanitizedString(1, 40, "La categoria");

const descriptionSchema = z
  .string()
  .transform(sanitizeText)
  .refine((v) => v.length <= 300, {
    message: "La descripcion no puede superar 300 caracteres",
  })
  .transform((v) => (v.length > 0 ? v : null));

export const createProductSchema = z
  .object({
    name: sanitizedString(2, 100, "El nombre"),
    category: categorySchema.default("otros"),
    description: descriptionSchema.optional(),
    status: z.enum(PRODUCT_STATUSES).default("available"),
    imageUrl: imageUrlSchema.optional(),
    imageUrls: imageUrlsSchema.optional(),
    priceCents: z.number().int("El precio debe ser un numero entero").min(0).max(100_000_000),
    stock: z.number().int("El stock debe ser un numero entero").min(0).max(1_000_000),
  })
  .refine((data) => (data.imageUrls?.length ?? 0) > 0 || Boolean(data.imageUrl), {
    path: ["imageUrls"],
    message: "Agrega al menos una imagen",
  });

export const updateProductSchema = z
  .object({
    name: sanitizedString(2, 100, "El nombre").optional(),
    category: categorySchema.optional(),
    description: descriptionSchema.optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    imageUrl: imageUrlSchema.optional(),
    imageUrls: imageUrlsSchema.optional(),
    priceCents: z
      .number()
      .int("El precio debe ser un numero entero")
      .min(0)
      .max(100_000_000)
      .optional(),
    stock: z
      .number()
      .int("El stock debe ser un numero entero")
      .min(0)
      .max(1_000_000)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No se envio ningun campo para actualizar",
  });

/** Categorias sugeridas para la tienda (el admin puede escribir otras). */
export const SUGGESTED_CATEGORIES = [
  "Snacks",
  "Bebidas",
  "Tecnologia",
  "Ropa",
  "Hogar",
  "Accesorios",
  "Otros",
] as const;

export const productIdSchema = z.string().uuid("Identificador no valido");

const customerEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("El correo no es valido")
  .max(254, "El correo es demasiado largo");

export const cartItemSchema = z.object({
  productId: z.string().uuid("Producto no valido"),
  quantity: z.number().int().min(1, "Cantidad minima: 1").max(99, "Cantidad maxima: 99"),
});

export const createOrderSchema = z
  .object({
    customerName: sanitizedString(2, 80, "El nombre"),
    customerPhone: sanitizedString(7, 20, "El telefono"),
    customerEmail: customerEmailSchema.optional(),
    notifyEmail: z.boolean().default(false),
    delivery: z.enum(["retiro", "domicilio"]).default("retiro"),
    address: sanitizedString(1, 200, "La direccion").optional(),
    payment: z.enum(["efectivo", "transferencia"]).default("efectivo"),
    notes: sanitizedString(1, 300, "Las notas").optional(),
    items: z
      .array(cartItemSchema)
      .min(1, "El pedido debe tener al menos un producto")
      .max(30, "Demasiados productos en el pedido"),
  })
  .refine((data) => data.delivery !== "domicilio" || (data.address ?? "").length > 0, {
    path: ["address"],
    message: "Para envio a domicilio es obligatorio indicar la direccion",
  })
  .refine((data) => !data.notifyEmail || !!data.customerEmail, {
    path: ["customerEmail"],
    message: "Escribe tu correo para recibir actualizaciones",
  });

export const updateOrderSchema = z
  .object({
    status: z
      .enum(["new", "confirmed", "in_transit", "delivered", "cancelled"])
      .optional(),
    shippingCents: z
      .number()
      .int()
      .min(0, "El envio no puede ser negativo")
      .max(10_000_000)
      .optional(),
    notes: sanitizedString(1, 300, "Las notas").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No se envio ningun campo para actualizar",
  });

export const createExpenseSchema = z.object({
  concept: sanitizedString(2, 120, "El concepto"),
  category: z.enum(["insumos", "envio", "empaque", "publicidad", "otros"]).default("otros"),
  amountCents: z
    .number()
    .int("El monto debe ser un numero entero")
    .min(1, "El monto debe ser mayor a 0")
    .max(1_000_000_000),
});

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
