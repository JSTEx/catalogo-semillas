import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";
import AuthSessionProvider from "@/components/SessionProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export const metadata: Metadata = {
  title: {
    default: "JecsitoShop | Semillas, snacks y más",
    template: "%s | JecsitoShop",
  },
  description:
    "Explora semillas, snacks y productos para disfrutar. Haz tu pedido en línea con opción de envío a domicilio o retiro.",
  robots: { index: true, follow: true },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
      (typeof process.env.VERCEL_PROJECT_PRODUCTION_URL === "string"
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : typeof process.env.VERCEL_URL === "string"
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NODE_ENV === "production"
            ? "https://jecsitoshop.vercel.app"
            : "http://localhost:3000"),
  ),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_SV",
    url: "/",
    siteName: "JecsitoShop",
    title: "JecsitoShop | Semillas, snacks y más",
    description:
      "Explora semillas, snacks y productos para disfrutar. Haz tu pedido en línea con opción de envío a domicilio o retiro.",
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
    title: "JecsitoShop | Semillas, snacks y más",
    description:
      "Explora semillas, snacks y productos para disfrutar. Haz tu pedido en línea con opción de envío a domicilio o retiro.",
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