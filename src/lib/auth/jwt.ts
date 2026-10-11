import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "seed_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 horas

const JWT_ISSUER = "catalogo-semillas";
const JWT_AUDIENCE = "admin";

export interface SessionPayload extends JWTPayload {
  sub: string;
  username: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET ausente o demasiado corto (requiere 32+ caracteres).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: {
  sub: string;
  username: string;
}): Promise<string> {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
