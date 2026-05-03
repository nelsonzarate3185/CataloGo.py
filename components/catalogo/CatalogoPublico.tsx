"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { ShoppingCart, Plus, Minus, MessageCircle, Search, X } from "lucide-react";
import { formatGS } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { createClient } from "@/lib/supabase/client";
import type { CatalogoConRelaciones, PedidoItem } from "@/types/catalogo";
import type { Producto } from "@/types/database";

interface CartState {
  [productoId: string]: number;
}

export default function CatalogoPublico({
  catalogo,
}: {
  catalogo: CatalogoConRelaciones;
}) {
  const supabase = createClient();
  const [cart, setCart] = useState<CartState>({});
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const comercio = catalogo.comercios;
  const categorias = [...catalogo.categorias]
    .filter((c) => c.activo)
    .sort((a, b) => a.orden - b.orden);
  const todosProductos = catalogo.productos.filter((p) => p.disponible);

  const productosFiltrados = useMemo(() => {
    let list = todosProductos;
    if (categoriaActiva) list = list.filter((p) => p.categoria_id === categoriaActiva);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.descripcion?.toLowerCase().includes(q) ?? false)
      );
    }
    return list.sort((a, b) => {
      if (a.destacado && !b.destacado) return -1;
      if (!a.destacado && b.destacado) return 1;
      return a.orden - b.orden;
    });
  }, [todosProductos, categoriaActiva, busqueda]);

  const cartItems: PedidoItem[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, cantidad]) => {
      const p = todosProductos.find((x) => x.id === id)!;
      return { producto_id: id, nombre: p.nombre, precio: p.precio, cantidad, imagen_url: p.imagen_url };
    });

  const totalItems = cartItems.reduce((s, i) => s + i.cantidad, 0);
  const totalPrecio = cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0);

  function addToCart(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }
  function removeFromCart(id: string) {
    setCart((prev) => {
      const qty = (prev[id] ?? 0) - 1;
      if (qty <= 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: qty };
    });
  }

  async function handleEnviarPedido() {
    if (cartItems.length === 0) return;
    setEnviando(true);

    // Registrar pedido en la base de datos
    await supabase.from("pedidos").insert({
      comercio_id: comercio.id,
      catalogo_id: catalogo.id,
      items: cartItems,
      total: totalPrecio,
    });

    const url = buildWhatsAppUrl({
      whatsapp: comercio.whatsapp,
      nombreComercio: comercio.nombre,
      items: cartItems,
    });

    setEnviando(false);
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {comercio.logo_url && (
                <div className="w-9 h-9 relative rounded-full overflow-hidden shrink-0">
                  <Image
                    src={comercio.logo_url}
                    alt={comercio.nombre}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h1 className="font-bold text-gray-900 text-sm leading-tight">
                  {comercio.nombre}
                </h1>
                <p className="text-xs text-gray-400">{catalogo.nombre}</p>
              </div>
            </div>

            {totalItems > 0 && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-green-600"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{totalItems}</span>
                <span className="hidden sm:inline">· {formatGS(totalPrecio)}</span>
              </button>
            )}
          </div>

          {/* Buscador */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50"
            />
          </div>

          {/* Categorías */}
          {categorias.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
              <CategoryPill
                label="Todos"
                active={!categoriaActiva}
                onClick={() => setCategoriaActiva(null)}
              />
              {categorias.map((cat) => (
                <CategoryPill
                  key={cat.id}
                  label={cat.nombre}
                  active={categoriaActiva === cat.id}
                  onClick={() =>
                    setCategoriaActiva(
                      categoriaActiva === cat.id ? null : cat.id
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Grid de productos */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-28">
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {busqueda ? `Sin resultados para "${busqueda}"` : "No hay productos disponibles."}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {productosFiltrados.map((producto) => (
              <ProductoCard
                key={producto.id}
                producto={producto}
                qty={cart[producto.id] ?? 0}
                onAdd={() => addToCart(producto.id)}
                onRemove={() => removeFromCart(producto.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Botón flotante carrito */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-gradient-to-t from-gray-50 to-transparent z-10">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-full flex items-center justify-between bg-green-500 text-white px-5 py-3.5 rounded-xl font-semibold shadow-lg hover:bg-green-600 text-sm"
            >
              <span className="bg-green-600 rounded-lg w-7 h-7 flex items-center justify-center text-xs font-bold">
                {totalItems}
              </span>
              <span>Ver carrito</span>
              <span>{formatGS(totalPrecio)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Drawer del carrito */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="w-full max-w-sm bg-white h-full overflow-y-auto flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Tu pedido</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto">
              {cartItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  El carrito está vacío
                </p>
              ) : (
                cartItems.map((item) => (
                  <div key={item.producto_id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.nombre}</p>
                      <p className="text-xs text-primary font-semibold">
                        {formatGS(item.precio)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.producto_id)}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => addToCart(item.producto_id)}
                        className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-24 text-right">
                      {formatGS(item.precio * item.cantidad)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="px-5 py-5 border-t">
                <div className="flex justify-between text-sm font-bold text-gray-900 mb-4">
                  <span>Total</span>
                  <span className="text-primary text-lg">{formatGS(totalPrecio)}</span>
                </div>
                <button
                  onClick={handleEnviarPedido}
                  disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3.5 rounded-xl font-semibold hover:bg-green-600 disabled:opacity-60"
                >
                  <MessageCircle className="w-5 h-5" />
                  {enviando ? "Abriendo WhatsApp..." : "Enviar pedido por WhatsApp"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function ProductoCard({
  producto,
  qty,
  onAdd,
  onRemove,
}: {
  producto: Producto;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-gray-100">
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            Sin foto
          </div>
        )}
        {producto.destacado && (
          <span className="absolute top-1.5 left-1.5 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            ★
          </span>
        )}
        {!producto.disponible && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-full">
              Sin stock
            </span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">
          {producto.nombre}
        </p>
        {producto.descripcion && (
          <p className="text-[11px] text-gray-400 mb-2 line-clamp-1">
            {producto.descripcion}
          </p>
        )}
        <p className="text-sm font-bold text-primary mt-auto mb-2">
          {formatGS(producto.precio)}
        </p>

        {producto.disponible && (
          <>
            {qty === 0 ? (
              <button
                onClick={onAdd}
                className="flex items-center justify-center gap-1 w-full bg-primary text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-primary/90"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={onRemove}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-bold">{qty}</span>
                <button
                  onClick={onAdd}
                  className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
