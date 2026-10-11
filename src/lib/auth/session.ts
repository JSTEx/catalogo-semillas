import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./jwt";
import type { SessionPayload } from "./jwt";

export type { SessionPayload };

/**
 * Lee la sesion desde la cookie HTTPOnly. Solo valido en el servidor
 * (Server Components, Route Handlers, Server Actions).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
