import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";
import AuthSessionProvider from "@/components/SessionProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export const metadata: Metadata = {
  title: {
    default: "JecsitoShop",
    template: "%s · JecsitoShop",
  },
  description:
    "Catalogo en linea de JecsitoShop: consulta productos y disponibilidad en tiempo real.",
  robots: { index: true, follow: true },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
      (typeof process.env.VERCEL_PROJECT_PRODUCTION_URL === "string"
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  openGraph: {
    type: "website",
    locale: "es_SV",
    url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "/",
    siteName: "JecsitoShop",
    title: "JecsitoShop · Tienda online",
    description:
      "Catálogo en línea de JecsitoShop: consulta productos y disponibilidad en tiempo real.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "JecsitoShop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JecsitoShop · Tienda online",
    description:
      "Catálogo en línea de JecsitoShop: consulta productos y disponibilidad en tiempo real.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/icons/favicon-dark.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icons/favicon.png" },
    ],
    apple: [{ url: "/icons/apple-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;

  let themeClass = "";
  if (themeCookie === "dark") {
    themeClass = "dark";
  } else if (themeCookie !== "light") {
    const hintHeaders = await headers();
    const systemPrefersDark =
      hintHeaders.get("sec-ch-prefers-color-scheme") === "dark";
    themeClass = systemPrefersDark ? "dark" : "";
  }

  return (
    <html lang="es" suppressHydrationWarning className={themeClass}>
      <body className="min-h-dvh antialiased">
        <AuthSessionProvider>
          <ConfirmProvider>
            <ThemeSync />
            {children}
          </ConfirmProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}