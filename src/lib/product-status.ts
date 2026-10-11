export const PRODUCT_STATUSES = [
  "available",
  "low_stock",
  "out_of_stock",
  "coming_soon",
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
}

export const STATUS_META: Record<ProductStatus, StatusMeta> = {
  available: {
    label: "Disponible",
    short: "Disponible",
    description:
      "Esta variedad esta disponible actualmente. Contactanos para reservar tu pedido.",
    availability: "En existencia",
    badge:
      "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
    solid: "bg-emerald-500",
  },
  low_stock: {
    label: "Pocas unidades",
    short: "Pocas unidades",
    description:
      "Quedan pocas unidades de esta variedad. Te recomendamos apartar tu pedido cuanto antes.",
    availability: "Pocas unidades",
    badge:
      "border-amber-200/70 bg-amber-50/80 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
    solid: "bg-amber-500",
  },
  out_of_stock: {
    label: "Agotado",
    short: "Agotado",
    description:
      "Por el momento esta variedad no tiene existencias. Vuelve pronto o consulta otras opciones.",
    availability: "Sin existencias",
    badge:
      "border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
    solid: "bg-rose-500",
  },
  coming_soon: {
    label: "Proximamente",
    short: "Proximamente",
    description:
      "Esta variedad llegara pronto al catalogo. Consultanos para mas informacion.",
    availability: "Proximamente",
    badge:
      "border-sky-200/70 bg-sky-50/80 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
    solid: "bg-sky-500",
  },
};

export function statusMeta(status: ProductStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.available;
}
