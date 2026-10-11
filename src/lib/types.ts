import type { Product } from "./db/schema";
import type { ProductStatus } from "./product-status";

export interface ProductDTO {
  id: string;
  name: string;
  status: ProductStatus;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export function toProductDTO(p: Product): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
