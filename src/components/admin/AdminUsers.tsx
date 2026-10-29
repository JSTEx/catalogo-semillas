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
        <div>
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-100">Administradores</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">Solo superadmin puede agregar o quitar accesos</p>
        </div>
      </div>
      <form onSubmit={add} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@gmail.com"
          className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm text-stone-800 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
        />
        <button type="submit" disabled={saving} className="rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 disabled:opacity-50">
          {saving ? "Agregando..." : "Agregar admin"}
        </button>
      </form>
      {error && <div className="px-5 pb-3"><p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p></div>}
      <div className="border-t border-stone-200/70 dark:border-stone-800/70">
        {loading ? (
          <p className="py-6 text-center text-sm text-stone-400">Cargando...</p>
        ) : (
          <div className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{r.email}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{r.role === "superadmin" ? "Superadmin" : "Admin"}</p>
                </div>
                {r.role !== "superadmin" && (
                  <button type="button" onClick={() => remove(r)} className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-stone-700 dark:text-stone-300 dark:hover:border-red-500/40 dark:hover:bg-red-500/15 dark:hover:text-red-300">
                    Quitar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
