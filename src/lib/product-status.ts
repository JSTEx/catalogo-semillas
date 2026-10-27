export const PRODUCT_STATUSES = [
  "available",
  "low_stock",
  "coming_soon",
  "out_of_stock",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface StatusMeta {
  label: string;
  short: string;
  description: string;
  availability: string;
  badge: string;
  dot: string;
  solid: string;
  rank: number;
}

export const STATUS_META: Record<ProductStatus, StatusMeta> = {
  available: {
    label: "Disponible",
    short: "Disponible",
    description:
      "Esta variedad esta disponible actualmente. Contactanos para reservar tu pedido.",
    availability: "En existencia",
    badge:
      "border-emerald-200/70 bg-emerald-50/90 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-950/90 dark:text-emerald-200",
    dot: "bg-emerald-500",
    solid: "bg-emerald-500",
    rank: 0,
  },
  low_stock: {
    label: "Pocas unidades",
    short: "Pocas unidades",
    description:
      "Quedan pocas unidades de esta variedad. Te recomendamos apartar tu pedido cuanto antes.",
    availability: "Pocas unidades",
    badge:
      "border-amber-200/70 bg-amber-50/90 text-amber-700 dark:border-amber-400/60 dark:bg-amber-950/90 dark:text-amber-200",
    dot: "bg-amber-500",
    solid: "bg-amber-500",
    rank: 1,
  },
  coming_soon: {
    label: "Proximamente",
    short: "Proximamente",
    description:
      "Esta variedad llegara pronto al catalogo. Consultanos para mas informacion.",
    availability: "Proximamente",
    badge:
      "border-sky-200/70 bg-sky-50/90 text-sky-700 dark:border-sky-400/60 dark:bg-sky-950/90 dark:text-sky-200",
    dot: "bg-sky-500",
    solid: "bg-sky-500",
    rank: 2,
  },
  out_of_stock: {
    label: "Agotado",
    short: "Agotado",
    description:
      "Por el momento esta variedad no tiene existencias. Vuelve pronto o consulta otras opciones.",
    availability: "Sin existencias",
    badge:
      "border-rose-200/70 bg-rose-50/90 text-rose-700 dark:border-rose-400/60 dark:bg-rose-950/90 dark:text-rose-200",
    dot: "bg-rose-500",
    solid: "bg-rose-500",
    rank: 3,
  },
};

export function statusMeta(status: ProductStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.available;
}

/** Ordena una lista de productos por prioridad de estado (disponibles primero). */
export function sortByStatus<T extends { status: ProductStatus }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) => (STATUS_META[a.status]?.rank ?? 0) - (STATUS_META[b.status]?.rank ?? 0),
  );
}

