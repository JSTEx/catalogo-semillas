import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
} from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/validation";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOrigin, jsonError } from "@/lib/http";

export const runtime = "nodejs";

// Hash bcrypt valido usado como senuelo para igualar el tiempo de respuesta
// cuando el usuario no existe (mitiga enumeracion de usuarios por timing).
const DUMMY_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7Z0h8Q0cM2H9M3nO0k4b1s2Y3e4u5w6";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return jsonError("Origen no permitido", 403);
  }

  const ip = getClientIp(req);
  const rl = await checkLoginRateLimit(`ip:${ip}`);
  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return jsonError("Demasiados intentos. Intenta de nuevo mas tarde.", 429, {
      "Retry-After": String(retryAfter),
      "X-RateLimit-Remaining": "0",
    });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Cuerpo de la peticion invalido", 400);
  }

  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    // Mensaje generico para no filtrar detalles de validacion.
    return jsonError("Credenciales invalidas", 400);
  }

  const { username, password } = parsed.data;

  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  const user = rows[0];
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    return jsonError("Credenciales invalidas", 401);
  }

  const token = await signSession({ sub: user.id, username: user.username });

  const res = NextResponse.json({ ok: true, username: user.username });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
