import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting para el endpoint de login: maximo 5 intentos por minuto por IP.
 * Si Upstash no esta configurado, se degrada de forma segura (permite la
 * peticion) para no romper el desarrollo local.
 */

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    limiter = null;
    return limiter;
  }

  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: true,
    prefix: "rl:login",
  });
  return limiter;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkLoginRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const l = getLimiter();
  if (!l) {
    return { success: true, limit: 5, remaining: 5, reset: 0 };
  }
  const { success, limit, remaining, reset } = await l.limit(identifier);
  return { success, limit, remaining, reset };
}

/**
 * Limite para crear pedidos: maximo 5 pedidos cada 10 minutos por IP.
 * Mitiga el spam (clientes enviando pedidos en masa).
 */
let orderLimiter: Ratelimit | null | undefined;

function getOrderLimiter(): Ratelimit | null {
  if (orderLimiter !== undefined) return orderLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    orderLimiter = null;
    return orderLimiter;
  }

  orderLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    analytics: true,
    prefix: "rl:orders",
  });
  return orderLimiter;
}

export async function checkOrderRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const l = getOrderLimiter();
  if (!l) {
    return { success: true, limit: 5, remaining: 5, reset: 0 };
  }
  const { success, limit, remaining, reset } = await l.limit(identifier);
  return { success, limit, remaining, reset };
}

/**
 * Limite para cancelar pedidos: 10 intentos cada 10 minutos por IP.
 * Mitiga el sondeo del telefono asociado a un pedido.
 */
let cancelLimiter: Ratelimit | null | undefined;

function getCancelLimiter(): Ratelimit | null {
  if (cancelLimiter !== undefined) return cancelLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    cancelLimiter = null;
    return cancelLimiter;
  }

  cancelLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    analytics: true,
    prefix: "rl:cancel",
  });
  return cancelLimiter;
}

export async function checkCancelRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const l = getCancelLimiter();
  if (!l) {
    return { success: true, limit: 10, remaining: 10, reset: 0 };
  }
  const { success, limit, remaining, reset } = await l.limit(identifier);
  return { success, limit, remaining, reset };
}
