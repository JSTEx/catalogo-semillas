import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";

export const metadata: Metadata = {
  title: {
    default: "JecsitoShop",
    template: "%s · JecsitoShop",
  },
  description:
    "Catalogo en linea de JecsitoShop: consulta productos y disponibilidad en tiempo real.",
  robots: { index: true, follow: true },
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
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}