import type { Catalogo, Categoria, Producto, Store } from "./database";

export interface CatalogoConRelaciones extends Catalogo {
  stores: Pick<Store, "id" | "nombre" | "telefono" | "logo_url">;
  categorias: Categoria[];
  productos: Producto[];
}
