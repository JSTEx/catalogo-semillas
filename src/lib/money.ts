export function formatMoney(cents: number): string {
  const n = Math.round(cents);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const dollars = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${String(rest).padStart(2, "0")}`;
}

export function sumMoney(...values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}