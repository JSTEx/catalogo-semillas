"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";

type AdminRow = {
  id: string;
  email: string;
  role: "superadmin" | "admin";
  createdAt: string;
};

export default function AdminUsers({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/allowed");
      if (!res.ok) throw new Error("No se pudo cargar");
      const data = (await res.json()) as { admins: AdminRow[] };
      setRows(data.admins);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) load();
  }, [canManage]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/allowed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No se pudo agregar");
      }
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: AdminRow) => {
    if (row.role === "superadmin") return;
    const ok = await confirm({
      title: "Quitar administrador",
      message: `¿Quitar acceso a ${row.email}?`,
      confirmText: "Quitar",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/allowed?email=${encodeURIComponent(row.email)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo quitar");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  if (!canManage) return null;

  return (
    <section className="rounded-3xl border border-stone-200/70 bg-white/70 shadow-sm backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70">
      <div className="flex flex-col gap-2 border-b border-stone-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-800 dark:text-stone-100">Administradores</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400">Solo el superadmin puede agregar o quitar accesos</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-12">
        <form onSubmit={add} className="flex flex-col gap-2 rounded-2xl border border-stone-200/70 bg-stone-50/60 p-4 sm:flex-row sm:items-center lg:col-span-12 dark:border-stone-800/70 dark:bg-stone-950/30">
          <div className="flex-1">
            <label className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">Agregar nuevo administrador</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@gmail.com"
              className="mt-1 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm text-stone-800 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
            />
          </div>
          <button type="submit" disabled={saving} className="mt-5 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 disabled:opacity-50">
            {saving ? "Agregando..." : "Agregar admin"}
          </button>
        </form>
        {error && <div className="lg:col-span-12"><p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p></div>}
        <div className="lg:col-span-12">
          {loading ? (
            <p className="py-8 text-center text-sm text-stone-400">Cargando...</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-stone-200/70 dark:border-stone-800/70">
              <div className="grid grid-cols-12 bg-stone-50/70 px-4 py-2 text-xs font-medium uppercase tracking-wide text-stone-400 dark:bg-stone-950/40 dark:text-stone-500">
                <div className="col-span-8 sm:col-span-9">Correo</div>
                <div className="col-span-3 sm:col-span-2">Rol</div>
                <div className="col-span-1 text-right">Acción</div>
              </div>
              <div className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
                {rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-12 items-center px-4 py-3">
                    <div className="col-span-8 sm:col-span-9">
                      <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-100">{r.email}</p>
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <span className={["inline-flex rounded-full px-2 py-0.5 text-xs font-medium", r.role === "superadmin" ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"].join(" ")}>
                        {r.role === "superadmin" ? "Superadmin" : "Admin"}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      {r.role !== "superadmin" ? (
                        <button type="button" onClick={() => remove(r)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-300" aria-label="Quitar">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
