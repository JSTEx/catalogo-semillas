import { z } from "zod";

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

export const createProductSchema = z.object({
  name: sanitizedString(2, 100, "El nombre"),
  isAvailable: z.boolean().default(true),
  imageUrl: imageUrlSchema,
});

export const updateProductSchema = z
  .object({
    name: sanitizedString(2, 100, "El nombre").optional(),
    isAvailable: z.boolean().optional(),
    imageUrl: imageUrlSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No se envio ningun campo para actualizar",
  });

export const productIdSchema = z.string().uuid("Identificador no valido");

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
