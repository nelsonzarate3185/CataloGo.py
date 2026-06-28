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

    await supabase.from("pedidos").insert({
      comercio_id: comercio.id,
      catalogo_id: catalogo.id,
      items: cartItems as any,
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
    <div className="min-h-screen" style={{ background: "#e9ebe4" }}>

      {/* Header principal — navy */}
      <header className="sticky top-0 z-20" style={{ background: "#0f1c2e" }}>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-4">

          {/* Logo + tienda */}
          <div className="flex items-center gap-3 min-w-0">
            {comercio.logo_url ? (
              <div className="w-9 h-9 relative rounded-full overflow-hidden shrink-0 border-2 border-white/20">
                <Image src={comercio.logo_url} alt={comercio.nombre} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-navy-950 font-heading font-extrabold text-sm">
                  {comercio.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="font-heading font-extrabold text-white text-[15px] leading-tight truncate">
                {comercio.nombre}
              </div>
              <div className="text-[11px] text-[#9fb0c2]">{catalogo.nombre}</div>
            </div>
          </div>

          {/* Buscador */}
          <div className="flex-1 flex items-stretch h-10 rounded-[10px] overflow-hidden">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos…"
              className="flex-1 border-0 px-4 text-[15px] text-foreground outline-none"
              style={{ background: "#fff" }}
            />
            <div
              className="flex items-center justify-center w-12"
              style={{ background: "#f6a623" }}
            >
              <Search className="w-5 h-5 text-navy-950" />
            </div>
          </div>

          {/* Carrito */}
          <button
            onClick={() => totalItems > 0 && setDrawerOpen(true)}
            className="flex items-end gap-2 px-2 py-1 rounded-[8px] text-white relative shrink-0"
            style={{ background: "transparent" }}
          >
            <div className="relative">
              <ShoppingCart className="w-7 h-7" strokeWidth={1.8} />
              {totalItems > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center font-extrabold text-[11px] rounded-full"
                  style={{ background: "#f6a623", color: "#1b2733" }}
                >
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-[13.5px] font-bold pb-0.5">Carrito</span>
          </button>
        </div>

        {/* Barra de categorías */}
        {categorias.length > 0 && (
          <div style={{ background: "#16283d" }}>
            <div className="max-w-5xl mx-auto px-5 py-2 flex gap-1 overflow-x-auto scrollbar-none">
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
                  onClick={() => setCategoriaActiva(categoriaActiva === cat.id ? null : cat.id)}
                />
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Grid de productos */}
      <main className="max-w-5xl mx-auto px-5 py-5 pb-28">
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            {busqueda
              ? `Sin resultados para "${busqueda}"`
              : "No hay productos disponibles."}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-heading text-[22px] font-extrabold text-foreground">
                {categoriaActiva
                  ? categorias.find((c) => c.id === categoriaActiva)?.nombre ?? "Productos"
                  : "Todos los productos"}
              </h2>
              <span className="text-[14px] text-muted-foreground">
                {productosFiltrados.length} artículo{productosFiltrados.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
          </>
        )}
      </main>

      {/* Botón flotante carrito */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 z-10"
          style={{ background: "linear-gradient(to top, #e9ebe4 60%, transparent)" }}>
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-[14px] font-bold text-[14px] shadow-card-md"
              style={{ background: "#f6a623", color: "#1b2733" }}
            >
              <span
                className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-extrabold"
                style={{ background: "#ef7d22", color: "#fff" }}
              >
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
          <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-sm bg-white h-full overflow-y-auto flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sage-300">
              <h2 className="font-heading text-[17px] font-extrabold text-foreground">
                Tu pedido
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto">
              {cartItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  El carrito está vacío
                </p>
              ) : (
                cartItems.map((item) => (
                  <div key={item.producto_id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-foreground">{item.nombre}</p>
                      <p className="text-[12.5px] font-bold text-primary">
                        {formatGS(item.precio)}
                      </p>
                    </div>
                    <div className="flex items-center border border-sage-300 rounded-[8px] overflow-hidden">
                      <button
                        onClick={() => removeFromCart(item.producto_id)}
                        className="w-8 h-8 flex items-center justify-center font-bold text-[17px] text-muted-foreground"
                        style={{ background: "#f5f6f3" }}
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-[14px] font-bold">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => addToCart(item.producto_id)}
                        className="w-8 h-8 flex items-center justify-center font-bold text-[17px] text-muted-foreground"
                        style={{ background: "#f5f6f3" }}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[13.5px] font-bold text-foreground w-24 text-right">
                      {formatGS(item.precio * item.cantidad)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="px-5 py-5 border-t border-sage-300">
                <div className="flex justify-between text-[14px] font-bold text-foreground mb-4">
                  <span>Total</span>
                  <span className="font-heading text-[20px] text-primary">{formatGS(totalPrecio)}</span>
                </div>
                <button
                  onClick={handleEnviarPedido}
                  disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-[24px] font-extrabold text-[14.5px] disabled:opacity-60"
                  style={{ background: "#f6a623", color: "#1b2733" }}
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
      className="flex-shrink-0 px-[10px] py-[5px] rounded-[6px] text-[13.5px] font-semibold transition-colors"
      style={
        active
          ? { background: "#f6a623", color: "#1b2733" }
          : { background: "transparent", color: "#dbe3ec" }
      }
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
    <div className="bg-white rounded-[12px] overflow-hidden shadow-card flex flex-col">
      {/* Imagen */}
      <div className="relative aspect-square" style={{ background: "#f3f5f1" }}>
        {producto.imagen_url ? (
          <Image src={producto.imagen_url} alt={producto.nombre} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#9aa6a0] text-xs font-mono">
            Sin foto
          </div>
        )}
        {producto.destacado && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-[6px] text-[11px] font-extrabold"
            style={{ background: "#c4314b", color: "#fff" }}
          >
            Destacado
          </span>
        )}
        {!producto.disponible && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">
              Sin stock
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-[13px] flex flex-col flex-1 gap-[6px]">
        <p className="text-[14px] leading-[1.3] text-foreground font-medium line-clamp-2">
          {producto.nombre}
        </p>
        {producto.descripcion && (
          <p className="text-[12px] text-muted-foreground line-clamp-1">
            {producto.descripcion}
          </p>
        )}
        <div className="mt-auto pt-1">
          <div className="font-heading text-[18px] font-extrabold text-foreground mb-2">
            {formatGS(producto.precio)}
          </div>

          {producto.disponible && (
            <>
              {qty === 0 ? (
                <button
                  onClick={onAdd}
                  className="w-full py-[9px] rounded-[8px] font-bold text-[13.5px]"
                  style={{ background: "#f6a623", color: "#1b2733" }}
                >
                  Agregar al carrito
                </button>
              ) : (
                <div className="flex items-center justify-between border border-sage-300 rounded-[8px] overflow-hidden">
                  <button
                    onClick={onRemove}
                    className="w-9 h-9 flex items-center justify-center font-bold text-[17px] text-muted-foreground"
                    style={{ background: "#f5f6f3" }}
                  >
                    −
                  </button>
                  <span className="text-[15px] font-bold text-foreground">{qty}</span>
                  <button
                    onClick={onAdd}
                    className="w-9 h-9 flex items-center justify-center font-bold text-[17px] text-muted-foreground"
                    style={{ background: "#f5f6f3" }}
                  >
                    +
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
