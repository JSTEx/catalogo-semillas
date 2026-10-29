import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
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

/**
 * Limite para subir comprobantes de pago: 10 intentos cada 10 minutos por IP.
 * Mitiga el abuso del almacenamiento subiendo imagenes en masa.
 */
let receiptLimiter: Ratelimit | null | undefined;

function getReceiptLimiter(): Ratelimit | null {
  if (receiptLimiter !== undefined) return receiptLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    receiptLimiter = null;
    return receiptLimiter;
  }

  receiptLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    analytics: true,
    prefix: "rl:receipt",
  });
  return receiptLimiter;
}

export async function checkReceiptRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const l = getReceiptLimiter();
  if (!l) {
    return { success: true, limit: 10, remaining: 10, reset: 0 };
  }
  const { success, limit, remaining, reset } = await l.limit(identifier);
  return { success, limit, remaining, reset };
}
