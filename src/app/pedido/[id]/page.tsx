import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { productIdSchema } from "@/lib/validation";
import { toPublicOrderDTO } from "@/lib/types";
import OrderTracker from "./OrderTracker";
import type { Metadata } from "next";
import { orderTrackingPath } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const path = orderTrackingPath(id);
  const title = "Seguimiento de pedido";
  const description =
    "Consulta el estado y los detalles de entrega de tu pedido en JecsitoShop.";

  return {
    title,
    description,
    robots: { index: false, follow: false, noarchive: true },
    openGraph: {
      type: "website",
      url: path,
      siteName: "JecsitoShop",
      title: `${title} | JecsitoShop`,
      description,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "JecsitoShop: semillas, snacks y más para disfrutar",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | JecsitoShop`,
      description,
      images: ["/og.png"],
    },
  };
}

function NotFound() {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="h-7 w-7"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">
        Pedido no encontrado
      </h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        El enlace no es valido o el pedido ya no existe.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center justify-center rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
      >
        Volver al catalogo
      </Link>
    </div>
  );
}

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!productIdSchema.safeParse(id).success) {
    return (
      <main className="min-h-dvh bg-stone-50 px-4 py-12 dark:bg-stone-950">
        <div className="mx-auto max-w-2xl">
          <NotFound />
        </div>
      </main>
    );
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, id));

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-12 dark:bg-stone-950">
      <div className="mx-auto max-w-2xl">
        {order ? <OrderTracker initial={toPublicOrderDTO(order)} /> : <NotFound />}
      </div>
    </main>
  );
}
