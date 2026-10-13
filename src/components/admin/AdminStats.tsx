"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExpenseDTO, OrderDTO } from "@/lib/types";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_META,
  PAYMENT_META,
  type ExpenseCategory,
} from "@/lib/orders";
import { formatMoney } from "@/lib/money";

interface Props {
  orders: OrderDTO[];
  expenses: ExpenseDTO[];
  onExpensesChange: Dispatch<SetStateAction<ExpenseDTO[]>>;
}

const ACTIVE_STATUSES = ["new", "confirmed", "in_transit"];
const CHART_COLORS = ["#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#f43f5e", "#14b8a6"];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export default function AdminStats({ orders, expenses, onExpensesChange }: Props) {
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("insumos");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const ingresos = orders
      .filter((o) => o.status === "delivered")
      .reduce((a, o) => a + o.totalCents, 0);
    const porCobrar = orders
      .filter((o) => (ACTIVE_STATUSES as string[]).includes(o.status))
      .reduce((a, o) => a + o.totalCents, 0);
    const gastos = expenses.reduce((a, e) => a + e.amountCents, 0);
    return {
      ingresos,
      porCobrar,
      gastos,
      ganancia: ingresos - gastos,
      pedidos: orders.length,
    };
  }, [orders, expenses]);

  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: monthKey(d), label: MONTH_LABELS[d.getMonth()] });
    }
    const ingByMonth: Record<string, number> = {};
    for (const o of orders) {
      if (o.status !== "delivered") continue;
      const k = monthKey(new Date(o.createdAt));
      ingByMonth[k] = (ingByMonth[k] ?? 0) + o.totalCents;
    }
    const gasByMonth: Record<string, number> = {};
    for (const e of expenses) {
      const k = monthKey(new Date(e.createdAt));
      gasByMonth[k] = (gasByMonth[k] ?? 0) + e.amountCents;
    }
    return buckets.map((b) => ({
      mes: b.label,
      ingresos: (ingByMonth[b.key] ?? 0) / 100,
      gastos: (gasByMonth[b.key] ?? 0) / 100,
    }));
  }, [orders, expenses]);

  const byPayment = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      map[o.payment] = (map[o.payment] ?? 0) + 1;
    }
    return Object.entries(map).map(([k, v], i) => ({
      name: PAYMENT_META[k as "efectivo" | "transferencia"]?.label ?? k,
      value: v,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [orders]);

  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      for (const it of o.items) {
        map[it.name] = (map[it.name] ?? 0) + it.quantity;
      }
    }
    return Object.entries(map)
      .map(([name, cantidad]) => ({ name, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);
  }, [orders]);

  const daily = useMemo(() => {
    const now = new Date();
    const days: { key: string; label: string; pedidos: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({
        key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        pedidos: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.key, i]));
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const i = idx.get(k);
      if (i !== undefined) days[i].pedidos += 1;
    }
    return days;
  }, [orders]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = Math.round((parseFloat(amount) || 0) * 100);
    if (concept.trim().length < 2) return setError("Escribe un concepto");
    if (cents <= 0) return setError("Escribe un monto mayor a 0");
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: concept.trim(), category, amountCents: cents }),
      });
      const data = (await res.json().catch(() => null)) as
        | { expense?: ExpenseDTO; error?: string }
        | null;
      if (!res.ok || !data?.expense) {
        throw new Error(data?.error ?? "No se pudo guardar el gasto");
      }
      onExpensesChange((prev) => [data.expense!, ...prev]);
      setConcept("");
      setAmount("");
      setCategory("insumos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar");
      onExpensesChange((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid #e7e5e4",
    fontSize: 12,
  };
  const axisTick = { fill: "#a8a29e", fontSize: 11 };
  const gridStroke = "rgba(120,113,108,0.18)";
  const inputClass =
    "rounded-2xl border border-stone-200 bg-white/80 px-3 py-2.5 text-sm text-stone-800 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100";

  const kpiCards = [
    { label: "Ingresos (entregado)", value: formatMoney(kpis.ingresos), accent: "text-emerald-600 dark:text-emerald-400" },
    { label: "Por cobrar", value: formatMoney(kpis.porCobrar), accent: "text-sky-600 dark:text-sky-400" },
    { label: "Gastos", value: formatMoney(kpis.gastos), accent: "text-rose-600 dark:text-rose-400" },
    { label: "Ganancia neta", value: formatMoney(kpis.ganancia), accent: "text-stone-900 dark:text-stone-100" },
    { label: "Pedidos", value: String(kpis.pedidos), accent: "text-stone-900 dark:text-stone-100" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70"
          >
            <p className="text-[11px] uppercase tracking-wide text-stone-400 dark:text-stone-500">
              {k.label}
            </p>
            <p className={["mt-1 text-xl font-bold", k.accent].join(" ")}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-md lg:col-span-2 dark:border-stone-800/70 dark:bg-stone-900/70">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Ingresos vs Gastos (ultimos 6 meses)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="ing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="mes" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => `$${Number(v).toFixed(2)}`}
                />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2} fill="url(#ing)" />
                <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#f43f5e" strokeWidth={2} fill="url(#gas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Pedidos por forma de pago
          </h3>
          {byPayment.length === 0 ? (
            <p className="py-16 text-center text-sm text-stone-400">Sin datos aun.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byPayment}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {byPayment.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-md lg:col-span-2 dark:border-stone-800/70 dark:bg-stone-900/70">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Productos mas vendidos (unidades)
          </h3>
          {topProducts.length === 0 ? (
            <p className="py-16 text-center text-sm text-stone-400">Sin datos aun.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#a8a29e", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="cantidad" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Pedidos (ultimos 14 dias)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 0, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="pedidos" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70">
        <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
          Gastos
        </h3>
        <form onSubmit={addExpense} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Concepto (ej. bolsas, Uber, publicidad)"
            maxLength={120}
            className={inputClass}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            aria-label="Categoria"
            className={inputClass}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{EXPENSE_CATEGORY_META[c].label}</option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Monto"
            inputMode="decimal"
            className={[inputClass, "sm:w-28"].join(" ")}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "..." : "Agregar"}
          </button>
        </form>

        {error && (
          <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        {expenses.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">Aun no registras gastos.</p>
        ) : (
          <ul className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-stone-700 dark:text-stone-200">
                    {e.concept}
                  </span>
                  <span className="text-xs text-stone-400 dark:text-stone-500">
                    {EXPENSE_CATEGORY_META[e.category].label} ·{" "}
                    {new Date(e.createdAt).toLocaleDateString("es")}
                  </span>
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  -{formatMoney(e.amountCents)}
                </span>
                <button
                  type="button"
                  onClick={() => removeExpense(e.id)}
                  aria-label="Eliminar gasto"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}