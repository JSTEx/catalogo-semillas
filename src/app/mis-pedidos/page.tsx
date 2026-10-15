import type { Metadata } from "next";
import MisPedidos from "@/components/MisPedidos";

export const metadata: Metadata = {
  title: "Mis pedidos",
};

export default function MisPedidosPage() {
  return <MisPedidos />;
}
