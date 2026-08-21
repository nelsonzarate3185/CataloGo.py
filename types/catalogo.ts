import type { Catalogo, Categoria, Producto, Comercio } from "./database";

export interface CatalogoConRelaciones extends Catalogo {
  /**
   * Sólo las columnas que el visitante anónimo tiene concedidas. `plan` y
   * `user_id` quedan fuera a propósito: no se le conceden a `anon`.
   */
  comercios: Pick<
    Comercio,
    "id" | "nombre" | "descripcion" | "whatsapp" | "logo_url" | "direccion"
  >;
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
