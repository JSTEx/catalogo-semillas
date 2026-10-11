import type { Product } from "./db/schema";

export interface ProductDTO {
  id: string;
  name: string;
  isAvailable: boolean;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export function toProductDTO(p: Product): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    isAvailable: p.isAvailable,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
