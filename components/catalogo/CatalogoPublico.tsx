"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingCart, Plus, Minus, MessageCircle } from "lucide-react";
import { formatGS } from "@/lib/utils";
import { buildWhatsAppUrl, type CartItem } from "@/lib/whatsapp";
import type { CatalogoConRelaciones } from "@/types/catalogo";

interface Props {
  catalogo: CatalogoConRelaciones;
}

interface CartState {
  [productoId: string]: number;
}

export default function CatalogoPublico({ catalogo }: Props) {
  const [cart, setCart] = useState<CartState>({});
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);

  const store = catalogo.stores;
  const categorias = catalogo.categorias.sort((a, b) => a.orden - b.orden);
  const productos = catalogo.productos.filter((p) => p.disponible);

  const productosFiltrados = categoriaActiva
    ? productos.filter((p) => p.categoria_id === categoriaActiva)
    : productos;

  const totalItems = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const totalPrecio = productos.reduce((sum, p) => {
    return sum + (cart[p.id] ?? 0) * p.precio;
  }, 0);

  function addToCart(productoId: string) {
    setCart((prev) => ({ ...prev, [productoId]: (prev[productoId] ?? 0) + 1 }));
  }

  function removeFromCart(productoId: string) {
    setCart((prev) => {
      const qty = (prev[productoId] ?? 0) - 1;
      if (qty <= 0) {
        const { [productoId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productoId]: qty };
    });
  }

  function handlePedir() {
    const items: CartItem[] = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, cantidad]) => {
        const p = productos.find((x) => x.id === id)!;
        return { nombre: p.nombre, cantidad, precio: p.precio };
      });

    const url = buildWhatsAppUrl({
      telefono: store.telefono,
      nombreNegocio: store.nombre,
      items,
    });

    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo_url && (
              <Image
                src={store.logo_url}
                alt={store.nombre}
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="font-bold text-gray-900">{store.nombre}</h1>
              <p className="text-xs text-gray-500">{catalogo.nombre}</p>
            </div>
          </div>

          {totalItems > 0 && (
            <button
              onClick={handlePedir}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-green-600"
            >
              <ShoppingCart className="w-4 h-4" />
              {totalItems} · {formatGS(totalPrecio)}
            </button>
          )}
        </div>

        {/* Filtro por categoría */}
        {categorias.length > 0 && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setCategoriaActiva(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                !categoriaActiva
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                  categoriaActiva === cat.id
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Productos */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {productosFiltrados.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            No hay productos en esta categoría.
          </p>
        )}

        {productosFiltrados.map((producto) => {
          const qty = cart[producto.id] ?? 0;
          return (
            <div
              key={producto.id}
              className="bg-white rounded-xl border flex overflow-hidden"
            >
              {producto.imagen_url && (
                <div className="w-24 h-24 flex-shrink-0 relative">
                  <Image
                    src={producto.imagen_url}
                    alt={producto.nombre}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {producto.nombre}
                  </p>
                  {producto.descripcion && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                      {producto.descripcion}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-primary text-sm">
                    {formatGS(producto.precio)}
                  </span>
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(producto.id)}
                      className="flex items-center gap-1 bg-primary text-white px-3 py-1 rounded-full text-xs font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(producto.id)}
                        className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">
                        {qty}
                      </span>
                      <button
                        onClick={() => addToCart(producto.id)}
                        className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Botón sticky de pedido */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-0 right-0 px-4 max-w-2xl mx-auto">
          <button
            onClick={handlePedir}
            className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:bg-green-600"
          >
            <MessageCircle className="w-5 h-5" />
            Pedir por WhatsApp · {formatGS(totalPrecio)}
          </button>
        </div>
      )}
    </div>
  );
}
