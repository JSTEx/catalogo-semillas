import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { toProductDTO } from "@/lib/types";
import CatalogClient from "@/components/CatalogClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Semillas, snacks y más",
  description:
    "Descubre el catálogo de JecsitoShop y haz tu pedido en línea. Elige envío a domicilio o retiro.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "JecsitoShop | Semillas, snacks y más",
    description:
      "Descubre el catálogo de JecsitoShop y haz tu pedido en línea. Elige envío a domicilio o retiro.",
    images: [
      {
        url: "/og-night.png",
        width: 1200,
        height: 630,
        alt: "JecsitoShop: semillas, snacks y más para disfrutar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JecsitoShop | Semillas, snacks y más",
    description:
      "Descubre el catálogo de JecsitoShop y haz tu pedido en línea. Elige envío a domicilio o retiro.",
    images: ["/og-night.png"],
  },
};

export default async function HomePage() {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.isHidden, false))
    .orderBy(desc(products.createdAt));

  return <CatalogClient initialProducts={rows.map(toProductDTO)} />;
}
