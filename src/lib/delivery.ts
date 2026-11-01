export const HOME_DELIVERY_FEE_CENTS = 450;

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
