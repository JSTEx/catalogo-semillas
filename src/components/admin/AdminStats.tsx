"use client";

import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
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
  formatDate,
  type ExpenseCategory,
} from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { MAX_PRODUCT_IMAGES } from "@/lib/validation";

interface Props {
  orders: OrderDTO[];
  expenses: ExpenseDTO[];
  onExpensesChange: Dispatch<SetStateAction<ExpenseDTO[]>>;
}

const ACTIVE_STATUSES = ["new", "confirmed", "in_transit"];
const CHART_COLORS = ["#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#f43f5e", "#14b8a6"];

const SV_TZ = "America/El_Salvador";
const SV_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: SV_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function svParts(d: Date): { year: number; month: number; day: number } {
  const parts = SV_PARTS.formatToParts(d);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function monthKey(d: Date): string {
  const p = svParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

interface ExpenseForm {
  concept: string;
  category: ExpenseCategory;
  amount: string;
  notes: string;
  imageUrls: string[];
}

const EMPTY_FORM: ExpenseForm = {
  concept: "",
  category: "insumos",
  amount: "",
  notes: "",
  imageUrls: [],
};

export default function AdminStats({ orders, expenses, onExpensesChange }: Props) {
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [undo, setUndo] = useState<ExpenseDTO | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const conceptRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  const kpis = useMemo(() => {
    const ingresos = orders
      .filter((o) => o.status === "delivered")
      .reduce((a, o) => a + o.totalCents, 0);
    const porCobrar = orders
      .filter((o) => (ACTIVE_STATUSES as string[]).includes(o.status))
      .reduce((a, o) => a + o.totalCents, 0);
    const gastos = expenses.reduce((a, e) => a + e.amountCents, 0);
    const ganancia = ingresos - gastos;
    const margen = ingresos > 0 ? Math.round((ganancia / ingresos) * 100) : 0;
    return {
      ingresos,
      porCobrar,
      gastos,
      ganancia,
      margen,
      pedidos: orders.length,
      entregados: orders.filter((o) => o.status === "delivered").length,
    };
  }, [orders, expenses]);

  const monthly = useMemo(() => {
    const now = svParts(new Date());
    const buckets: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const total = now.year * 12 + (now.month - 1) - i;
      const year = Math.floor(total / 12);
      const month = (total % 12) + 1;
      buckets.push({
        key: `${year}-${String(month).padStart(2, "0")}`,
        label: MONTH_LABELS[month - 1],
      });
    }
    const ingByMonth: Record<string, number> = {};
    for (const o of orders) {
      if (o.status !== "delivered") continue;
      const k = monthKey(new Date(o.deliveredAt ?? o.createdAt));
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
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const p = svParts(d);
      days.push({
        key: `${p.year}-${p.month}-${p.day}`,
        label: `${p.day}/${p.month}`,
        pedidos: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.key, i]));
    for (const o of orders) {
      const p = svParts(new Date(o.createdAt));
      const k = `${p.year}-${p.month}-${p.day}`;
      const i = idx.get(k);
      if (i !== undefined) days[i].pedidos += 1;
    }
    return days;
  }, [orders]);

  const expensesByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amountCents;
    }
    return Object.entries(map)
      .map(([cat, cents], i) => ({
        name: EXPENSE_CATEGORY_META[cat as ExpenseCategory].label,
        value: cents / 100,
        cents,
        color: CHART_COLORS[(i + 2) % CHART_COLORS.length],
      }))
      .sort((a, b) => b.cents - a.cents);
  }, [expenses]);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PRODUCT_IMAGES - form.imageUrls.length;
    if (remaining <= 0) return setError(`Máximo ${MAX_PRODUCT_IMAGES} imágenes por gasto`);
    setUploading(true);
    setError(null);
    try {
      const list = Array.from(files).slice(0, remaining);
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!res.ok || !data?.url) throw new Error(data?.error ?? "No se pudo subir la imagen");
        setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, data.url!] }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function startEdit(e: ExpenseDTO) {
    setEditingId(e.id);
    setForm({
      concept: e.concept,
      category: e.category,
      amount: (e.amountCents / 100).toFixed(2),
      notes: e.notes ?? "",
      imageUrls: e.imageUrls ?? (e.imageUrl ? [e.imageUrl] : []),
    });
    setError(null);
    setShowForm(true);
    requestAnimationFrame(() => {
      const el = formRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      conceptRef.current?.focus({ preventScroll: true });
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(false);
  }

  async function submitExpense(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    const cents = Math.round((parseFloat(form.amount.replace(",", ".")) || 0) * 100);
    if (form.concept.trim().length < 2) return setError("Escribe un concepto");
    if (cents <= 0) return setError("Escribe un monto mayor a 0");
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/expenses/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept: form.concept.trim(),
            category: form.category,
            amountCents: cents,
            notes: form.notes.trim() || undefined,
            imageUrls: form.imageUrls,
          }),
        });
        const data = (await res.json().catch(() => null)) as { expense?: ExpenseDTO; error?: string } | null;
        if (!res.ok || !data?.expense) throw new Error(data?.error ?? "No se pudo actualizar");
        onExpensesChange((prev) => prev.map((x) => (x.id === editingId ? data.expense! : x)));
        cancelEdit();
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept: form.concept.trim(),
            category: form.category,
            amountCents: cents,
            notes: form.notes.trim() || undefined,
            imageUrls: form.imageUrls,
          }),
        });
        const data = (await res.json().catch(() => null)) as { expense?: ExpenseDTO; error?: string } | null;
        if (!res.ok || !data?.expense) throw new Error(data?.error ?? "No se pudo guardar el gasto");
        onExpensesChange((prev) => [data.expense!, ...prev]);
        setForm(EMPTY_FORM);
        setShowForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function commitExpenseDeletion(e: ExpenseDTO) {
    try {
      const res = await fetch(`/api/expenses/${e.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar");
      setUndo((current) => (current?.id === e.id ? null : current));
    } catch (err) {
      onExpensesChange((prev) =>
        [e, ...prev.filter((x) => x.id !== e.id)].sort((a, b) =>
          (b.createdAt || "").localeCompare(a.createdAt || ""),
        ),
      );
      setError(err instanceof Error ? err.message : "Error al eliminar");
      setUndo(null);
    } finally {
      undoTimer.current = null;
    }
  }

  async function removeExpense(e: ExpenseDTO) {
    if (undo) return;
    const ok = await confirm({
      title: "Eliminar gasto",
      message: "¿Eliminar este gasto? Podrás deshacerlo por unos segundos.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    setUndo(e);
    onExpensesChange((prev) => prev.filter((x) => x.id !== e.id));
    if (editingId === e.id) cancelEdit();
    undoTimer.current = setTimeout(() => {
      void commitExpenseDeletion(e);
    }, 5000);
  }

  function restoreExpense() {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndo(null);
    onExpensesChange((prev) =>
      [undo, ...prev.filter((x) => x.id !== undo.id)].sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""),
      ),
    );
  }

  const tooltipStyle = { borderRadius: 12, border: "1px solid rgba(120,113,108,0.4)", background: "rgba(28,25,23,0.95)", color: "#f5f5f4", fontSize: 12 };
  const axisTick = { fill: "#a8a29e", fontSize: 11 };
  const gridStroke = "rgba(120,113,108,0.18)";
  const inputClass = "w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30";

  const kpiCards = [
    { label: "Ingresos entregados", value: formatMoney(kpis.ingresos), accent: "text-emerald-600 dark:text-emerald-400" },
    { label: "Por cobrar", value: formatMoney(kpis.porCobrar), accent: "text-sky-600 dark:text-sky-400" },
    { label: "Gastos totales", value: formatMoney(kpis.gastos), accent: "text-rose-600 dark:text-rose-400" },
    { label: "Ganancia neta", value: formatMoney(kpis.ganancia), accent: kpis.ganancia >= 0 ? "text-stone-900 dark:text-stone-100" : "text-rose-600 dark:text-rose-400" },
    { label: "Margen", value: `${kpis.margen}%`, accent: kpis.margen >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
    { label: "Pedidos / Entregados", value: `${kpis.pedidos} / ${kpis.entregados}`, accent: "text-stone-900 dark:text-stone-100" },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <section aria-labelledby="stats-overview-title" className="space-y-2.5 sm:space-y-3">
        <div>
          <h2 id="stats-overview-title" className="text-lg font-semibold text-stone-800 dark:text-stone-100">Resumen financiero</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Ingresos, gastos y actividad de tus pedidos en un solo lugar.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-xl border border-stone-200 bg-white px-2.5 py-2.5 shadow-sm dark:border-stone-700 dark:bg-stone-900 sm:rounded-2xl sm:px-4 sm:py-3">
            <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-stone-500 dark:text-stone-300 sm:text-[11px]">{k.label}</p>
            <p className={["mt-1 break-words text-base font-bold sm:text-xl", k.accent].join(" ")}>{k.value}</p>
          </div>
        ))}
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900 sm:rounded-3xl">
        <div className="flex flex-col gap-3 border-b border-stone-200 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 dark:border-stone-700">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-stone-800 dark:text-stone-100">Gastos</h3>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">{expenses.length}</span>
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Total <span className="font-semibold text-rose-600 dark:text-rose-400">-{formatMoney(kpis.gastos)}</span> · registra y administra comprobantes
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editingId ? (
              <>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Editando gasto</span>
                <button type="button" onClick={cancelEdit} className="rounded-2xl border border-stone-200 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">Cancelar</button>
              </>
            ) : (
              <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm((v) => !v); }} className="rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600">
                {showForm ? "Cerrar" : "Agregar gasto"}
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <form ref={formRef} onSubmit={submitExpense} className="grid grid-cols-1 gap-3 border-b border-stone-200 bg-stone-50 p-3.5 sm:p-5 lg:grid-cols-12 dark:border-stone-700 dark:bg-stone-950">
            <div className="lg:col-span-12">
              <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100">{editingId ? "Editar gasto" : "Nuevo gasto"}</h4>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Completa los datos y conserva o agrega comprobantes antes de guardar.</p>
            </div>
            <div className="space-y-2 lg:col-span-4">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Concepto</label>
              <input ref={conceptRef} value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} placeholder="Ej. Bolsas, flete, publicidad..." className={inputClass} />
            </div>
            <div className="space-y-2 lg:col-span-3">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Categoría</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })} className={inputClass}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_META[c].label}</option>)}
              </select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Monto (USD)</label>
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" inputMode="decimal" className={inputClass} />
            </div>
            <div className="space-y-2 lg:col-span-3">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Notas (opcional)</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Detalle adicional" className={inputClass} />
            </div>
            <div className="space-y-3 lg:col-span-12">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Comprobantes / imágenes</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Puedes subir varias imágenes (JPG, PNG, WEBP)</p>
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || form.imageUrls.length >= MAX_PRODUCT_IMAGES} className="rounded-2xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
                  {uploading ? "Subiendo..." : editingId ? "Agregar imágenes" : "Subir imágenes"}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
              </div>
              {form.imageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {form.imageUrls.map((url, idx) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700">
                      <button type="button" onClick={() => setPreview(url)} className="h-full w-full" aria-label={`Ver comprobante ${idx + 1}`}>
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Quitar imagen ${idx + 1}`}
                        onClick={() => setForm((prev) => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }))}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {error && <div className="lg:col-span-12"><p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p></div>}
            <div className="flex flex-col gap-2 border-t border-stone-200/70 pt-3 sm:flex-row sm:items-center sm:justify-end lg:col-span-12 dark:border-stone-800/70">
              <button type="button" onClick={cancelEdit} className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
                Cancelar
              </button>
              <button type="submit" disabled={saving || uploading} className="rounded-2xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 disabled:opacity-50">
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar gasto"}
              </button>
            </div>
          </form>
        )}
        <div className="border-t border-stone-200 dark:border-stone-700">
          {expenses.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-400">Aún no registras gastos.</p>
          ) : (
            <div className="grid gap-2.5 p-3 sm:grid-cols-2 sm:gap-3 sm:p-5 xl:grid-cols-3">
              {expenses.map((e) => (
                <article key={e.id} className={["flex min-w-0 flex-col justify-between gap-3 rounded-xl border p-3 transition-colors sm:rounded-2xl sm:p-4", editingId === e.id ? "border-amber-300 bg-amber-50 dark:border-amber-500/50 dark:bg-amber-950/40" : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/70 dark:hover:border-stone-600"].join(" ")}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {e.imageUrl ? (
                      <button type="button" onClick={() => setPreview(e.imageUrl)} className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
                        <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 text-stone-400 dark:border-stone-700">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{e.concept}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 dark:bg-stone-800">{EXPENSE_CATEGORY_META[e.category].label}</span>
                        <span>{formatDate(e.createdAt)}</span>
                        {e.imageUrls && e.imageUrls.length > 0 && <span>{e.imageUrls.length} {e.imageUrls.length === 1 ? "comprobante" : "comprobantes"}</span>}
                      </div>
                      {e.notes && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{e.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-2.5 dark:border-stone-700">
                    <p className="text-base font-bold text-rose-600 dark:text-rose-400">-{formatMoney(e.amountCents)}</p>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => startEdit(e)} disabled={undo !== null} className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-2.5 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-white hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100" aria-label="Editar gasto">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      <button type="button" onClick={() => removeExpense(e)} disabled={undo !== null} className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-2.5 text-xs font-medium text-stone-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:border-red-500/40 dark:hover:bg-red-500/15 dark:hover:text-red-300" aria-label="Eliminar gasto">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {undo && (
        <div className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.9)] ring-1 ring-white/10 dark:bg-stone-100 dark:text-stone-900 dark:shadow-[0_20px_60px_-20px_rgba(255,255,255,0.4)] dark:ring-stone-900/10">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 dark:bg-stone-900/10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
              </span>
              <span className="font-medium">Gasto quitado de la lista</span>
            </div>
            <button type="button" onClick={restoreExpense} className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-white/20 dark:bg-stone-900/10 dark:hover:bg-stone-900/20">Deshacer</button>
          </div>
        </div>
      )}

      <section aria-labelledby="stats-trends-title" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="stats-trends-title" className="text-lg font-semibold text-stone-800 dark:text-stone-100">Actividad y tendencias</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Consulta el comportamiento de ingresos, pedidos y productos.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm sm:rounded-3xl sm:p-5 xl:col-span-8 dark:border-stone-700 dark:bg-stone-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Ingresos vs Gastos (últimos 6 meses)</h3>
            <span className="text-xs text-stone-400 dark:text-stone-500">Valores en USD</span>
          </div>
          <div className="h-72">
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
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toFixed(2)}`, ""]} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2} fill="url(#ing)" />
                <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#f43f5e" strokeWidth={2} fill="url(#gas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm sm:rounded-3xl sm:p-5 xl:col-span-4 dark:border-stone-700 dark:bg-stone-900">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Gastos por categoría</h3>
          {expensesByCat.length === 0 ? (
            <p className="py-16 text-center text-sm text-stone-400">Sin gastos registrados.</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensesByCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                      {expensesByCat.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toFixed(2)}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-2 text-sm">
                {expensesByCat.map((c) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      <span className="text-stone-600 dark:text-stone-300">{c.name}</span>
                    </div>
                    <span className="font-semibold text-stone-800 dark:text-stone-100">{formatMoney(c.cents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm sm:rounded-3xl sm:p-5 xl:col-span-5 dark:border-stone-700 dark:bg-stone-900">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Productos más vendidos (unidades)</h3>
          {topProducts.length === 0 ? (
            <p className="py-16 text-center text-sm text-stone-400">Sin datos aún.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 12, left: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#a8a29e", fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="cantidad" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm sm:rounded-3xl sm:p-5 xl:col-span-3 dark:border-stone-700 dark:bg-stone-900">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Pedidos por forma de pago</h3>
          {byPayment.length === 0 ? (
            <p className="py-16 text-center text-sm text-stone-400">Sin datos aún.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byPayment} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {byPayment.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm sm:rounded-3xl sm:p-5 xl:col-span-4 dark:border-stone-700 dark:bg-stone-900">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Pedidos (últimos 14 días)</h3>
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
      </section>

      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setPreview(null)} />
          <div className="relative z-10 max-h-[90vh] max-w-[90vw] overflow-auto rounded-3xl">
            <img src={preview} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />
            <button type="button" onClick={() => setPreview(null)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </div>
        </div>
      )}
    </div>
  );
}
