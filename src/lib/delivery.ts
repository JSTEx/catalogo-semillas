export const HOME_DELIVERY_FEE_CENTS = 499;

export const DELIVERY_CARRIERS = [
  { id: "xpress", name: "Xpress", baseFeeCents: 412, commissionBps: 250 },
  { id: "trucker_same_day", name: "Trucker (Mismo Día)", baseFeeCents: 383, commissionBps: 200 },
  { id: "rapiurban", name: "RapiUrban", baseFeeCents: 350, commissionBps: 100 },
  { id: "forza", name: "Forza (promoción)", baseFeeCents: 99, commissionBps: 300 },
  { id: "trucker_24h", name: "Trucker (Entrega 24 hrs)", baseFeeCents: 383, commissionBps: 200 },
  { id: "c807_xpress", name: "c807 Xpress", baseFeeCents: 409, commissionBps: 400 },
  { id: "cointra_xpress", name: "Cointra Xpress", baseFeeCents: 412, commissionBps: 300 },
  { id: "aeromall", name: "Aeromall", baseFeeCents: 450, commissionBps: 300 },
  { id: "aeroflash", name: "Aeroflash", baseFeeCents: 450, commissionBps: 300 },
] as const;

export type DeliveryCarrierId = (typeof DELIVERY_CARRIERS)[number]["id"];

export function isDeliveryCarrierId(value: string): value is DeliveryCarrierId {
  return DELIVERY_CARRIERS.some((carrier) => carrier.id === value);
}

export function quoteDeliveryCarrier(
  carrierId: DeliveryCarrierId,
  collectedCents: number,
  cashOnDelivery = true,
) {
  const carrier = DELIVERY_CARRIERS.find((item) => item.id === carrierId);
  if (!carrier) throw new Error("Empresa de envío desconocida");
  const commissionBps = cashOnDelivery ? carrier.commissionBps : 0;
  const commissionCents = cashOnDelivery
    ? Math.round((collectedCents * commissionBps) / 10_000)
    : 0;
  return {
    carrierId: carrier.id,
    carrierName: carrier.name,
    baseFeeCents: carrier.baseFeeCents,
    commissionBps,
    commissionCents,
    totalCostCents: carrier.baseFeeCents + commissionCents,
  };
}

export const EL_SALVADOR_DEPARTMENTS = [
  "Ahuachapán",
  "Cabañas",
  "Chalatenango",
  "Cuscatlán",
  "La Libertad",
  "La Paz",
  "La Unión",
  "Morazán",
  "San Miguel",
  "San Salvador",
  "San Vicente",
  "Santa Ana",
  "Sonsonate",
  "Usulután",
] as const;

export function formatDeliveryAddress(address: {
  department: string;
  municipality: string;
  streetAddress: string;
  reference: string;
}): string {
  return [
    `Departamento: ${address.department}`,
    `Municipio: ${address.municipality}`,
    `Dirección exacta: ${address.streetAddress}`,
    `Referencia: ${address.reference}`,
  ].join("\n");
}
