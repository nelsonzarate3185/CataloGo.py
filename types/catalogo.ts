import type { Catalogo, Categoria, Producto, Comercio } from "./database";

export interface CatalogoConRelaciones extends Catalogo {
  comercios: Pick<Comercio, "id" | "nombre" | "whatsapp" | "logo_url" | "plan">;
  categorias: Categoria[];
  productos: Producto[];
}

export interface PedidoItem {
  producto_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url?: string | null;
}
