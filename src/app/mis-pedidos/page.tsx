import type { Metadata } from "next";
import MisPedidos from "@/components/MisPedidos";

export const metadata: Metadata = {
  title: "Mis pedidos",
  description:
    "Inicia sesión para consultar el historial y el estado de tus pedidos en JecsitoShop.",
  robots: { index: false, follow: false, noarchive: true },
  openGraph: {
    type: "website",
    url: "/mis-pedidos",
    title: "Mis pedidos | JecsitoShop",
    description:
      "Consulta el historial y el estado de tus pedidos en JecsitoShop.",
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
    title: "Mis pedidos | JecsitoShop",
    description:
      "Consulta el historial y el estado de tus pedidos en JecsitoShop.",
    images: ["/og-night.png"],
  },
};

export default function MisPedidosPage() {
  return <MisPedidos />;
}
