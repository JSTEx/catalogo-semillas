import type {
  Expense,
  Order,
  Product,
} from "./db/schema";
import type { ProductStatus } from "./product-status";

export interface ProductDTO {
  id: string;
  name: string;
  status: ProductStatus;
  imageUrl: string;
  priceCents: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export function toProductDTO(p: Product): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    imageUrl: p.imageUrl,
    priceCents: p.priceCents,
    stock: p.stock,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export interface OrderItem {
  productId: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  quantity: number;
}

export interface OrderDTO {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  delivery: "retiro" | "domicilio";
  address: string | null;
  payment: "efectivo" | "transferencia";
  status: "new" | "confirmed" | "in_transit" | "delivered" | "cancelled";
  items: OrderItem[];
  productsTotal: number;
  shippingCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toOrderDTO(o: Order): OrderDTO {
  return {
    id: o.id,
    number: o.number,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    delivery: o.delivery,
    address: o.address,
    payment: o.payment,
    status: o.status,
    items: (o.items ?? []) as OrderItem[],
    productsTotal: o.productsTotal,
    shippingCents: o.shippingCents,
    totalCents: o.totalCents,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function toOrderDTOList(rows: Order[]): OrderDTO[] {
  return rows.map(toOrderDTO);
}

/**
 * Version publica de un pedido para la pagina de seguimiento del cliente.
 * Omite datos privados (nombre, telefono, direccion y notas del cliente).
 */
export interface PublicOrderDTO {
  id: string;
  number: number;
  delivery: "retiro" | "domicilio";
  status: "new" | "confirmed" | "in_transit" | "delivered" | "cancelled";
  items: OrderItem[];
  productsTotal: number;
  shippingCents: number;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

export function toPublicOrderDTO(o: Order): PublicOrderDTO {
  return {
    id: o.id,
    number: o.number,
    delivery: o.delivery,
    status: o.status,
    items: (o.items ?? []) as OrderItem[],
    productsTotal: o.productsTotal,
    shippingCents: o.shippingCents,
    totalCents: o.totalCents,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export interface ExpenseDTO {
  id: string;
  concept: string;
  category: "insumos" | "envio" | "empaque" | "publicidad" | "otros";
  amountCents: number;
  createdAt: string;
}

export function toExpenseDTO(e: Expense): ExpenseDTO {
  return {
    id: e.id,
    concept: e.concept,
    category: e.category,
    amountCents: e.amountCents,
    createdAt: e.createdAt.toISOString(),
  };
}

export function toExpenseDTOList(rows: Expense[]): ExpenseDTO[] {
  return rows.map(toExpenseDTO);
}