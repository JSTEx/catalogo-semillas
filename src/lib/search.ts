/**
 * Normaliza texto para busquedas: minusculas y sin acentos/diacriticos,
 * de modo que "mani" encuentre "Maní".
 */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
