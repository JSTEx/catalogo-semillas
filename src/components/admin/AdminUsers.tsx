"use client";

import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

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
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/allowed?email=${encodeURIComponent(row.email)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo quitar");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200/70 bg-white/70 shadow-sm backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70">
      <header className="flex flex-col gap-4 border-b border-stone-200/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800/70">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-800 dark:text-stone-100">Administradores</h3>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">Gestiona quién puede acceder al panel con su correo.</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          {rows.length} {rows.length === 1 ? "acceso" : "accesos"}
        </span>
      </header>

      <div className="space-y-5 p-5">
        <form onSubmit={add} className="rounded-2xl border border-stone-200/70 bg-stone-50/70 p-4 dark:border-stone-800/70 dark:bg-stone-950/30">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Agregar administrador</h4>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">La persona deberá iniciar sesión con este correo.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="admin-email" className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-300">Correo electrónico</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@gmail.com"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
              />
            </div>
            <button type="submit" disabled={saving} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Agregando..." : "Agregar acceso"}
            </button>
          </div>
        </form>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        <div className="overflow-hidden rounded-2xl border border-stone-200/70 dark:border-stone-800/70">
          {loading ? (
            <p className="py-8 text-center text-sm text-stone-400">Cargando...</p>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 bg-stone-50/70 px-4 py-3 text-xs font-medium uppercase tracking-wide text-stone-400 dark:bg-stone-950/40 dark:text-stone-500">
                <span>Correo</span>
                <span>Rol</span>
                <span className="text-right">Acción</span>
              </div>
              <div className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
                {rows.length ? rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3">
                    <p className="min-w-0 truncate text-sm font-medium text-stone-800 dark:text-stone-100">{r.email}</p>
                    <span className={["inline-flex rounded-full px-2.5 py-1 text-xs font-medium", r.role === "superadmin" ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"].join(" ")}>
                      {r.role === "superadmin" ? "Superadmin" : "Admin"}
                    </span>
                    {r.role !== "superadmin" ? (
                      <button type="button" onClick={() => remove(r)} disabled={saving} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-500/15 dark:hover:text-red-300" aria-label={`Quitar acceso a ${r.email}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      </button>
                    ) : (
                      <span className="h-9 w-9" aria-hidden="true" />
                    )}
                  </div>
                )) : (
                  <p className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">Aún no hay administradores registrados.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
