import { NextResponse } from "next/server";
import { getAdminUser } from "./admin/server";

export function getClientIp(req: Request): string {
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Proteccion CSRF: en peticiones mutantes el navegador envia el header Origin.
 * Verificamos que coincida con el host de la peticion.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(
  message: string,
  status: number,
  extraHeaders?: HeadersInit,
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: extraHeaders },
  );
}

/**
 * Comprueba sesion + origen en endpoints de administracion.
 * Devuelve el administrador autorizado o una respuesta de error lista para retornar.
 *
 * Solo se exige `Origin` en metodos que mutan estado: los navegadores no lo
 * envian en GET/HEAD del mismo origen, y bloquearlos romperia esos endpoints.
 */
export async function requireAdmin(
  req: Request,
): Promise<
  | {
      authorized: true;
      admin: NonNullable<Awaited<ReturnType<typeof getAdminUser>>>;
    }
  | { authorized: false; response: NextResponse }
> {
  const method = req.method.toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (mutating && !isSameOrigin(req)) {
    return { authorized: false, response: jsonError("Origen no permitido", 403) };
  }
  const admin = await getAdminUser();
  if (!admin) {
    return { authorized: false, response: jsonError("No autorizado", 401) };
  }
  return { authorized: true, admin };
}
