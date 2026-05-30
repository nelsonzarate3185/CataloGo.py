import React, { useState } from 'react';
import { 
  Search, ShoppingCart, ShoppingBag, ArrowLeft, ArrowRight, X, Check,
  Sparkles, PhoneCall, HelpCircle, MapPin, CreditCard, MessageSquare, Tag, Store
} from 'lucide-react';
import { Product, Order, OrderItem, UserProfile } from '../types';
import { db, OperationType, handleFirestoreError, doc, setDoc } from '../supabase';
import { formatGS, formatWhatsAppPhone } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface MarketplaceViewProps {
  products: Product[];
  vendorProfile: UserProfile | null;
  onSetView: (view: string) => void;
  onSetActiveOrderId: (id: string | null) => void;
  currentUser?: any;
}

export default function MarketplaceView({ products, vendorProfile, onSetView, onSetActiveOrderId, currentUser }: MarketplaceViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Cart state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [buyerName, setBuyerName] = useState(currentUser?.displayName || '');
  const [buyerNote, setBuyerNote] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Auto pre-populate registered buyer name if changed asynchronously
  React.useEffect(() => {
    if (currentUser?.displayName && !buyerName) {
      setBuyerName(currentUser.displayName);
    }
  }, [currentUser]);

  // Detail Modal State
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Business Rules: Limit free plan to max 30 products
  const activePlan = vendorProfile?.plan || 'free';
  const visibleProducts = activePlan === 'free' ? products.slice(0, 30) : products;

  // Dynamic Categories list
  const categories = ['all', ...Array.from(new Set(visibleProducts.map(p => p.category)))];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Checkout process: Persist to Firestore and then open WhatsApp
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!buyerName.trim()) {
      alert("Por favor ingresa tu nombre de comprador.");
      return;
    }

    setSubmittingOrder(true);
    const orderId = 'order_' + Math.random().toString(36).substring(2, 11);
    
    const isRealUser = currentUser && !currentUser.uid?.startsWith('guest_');

    const newOrder: Order = {
      id: orderId,
      vendorId: vendorProfile?.uid || 'all_vendors',
      buyerName: buyerName.trim(),
      buyerNote: buyerNote.trim(),
      buyerUid: isRealUser ? currentUser.uid : undefined,
      items: cart,
      total: cartTotal,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const path = `orders/${orderId}`;
    try {
      // 1. Log in firestore
      await setDoc(doc(db, 'orders', orderId), newOrder);
      
      // 2. Format detailed message
      const itemsDetailText = cart.map(item => 
        `• ${item.quantity}x ${item.productName} — ${formatGS(item.price)} c/u`
      ).join('\n');
      
      const slug = vendorProfile?.slug || 'vendedor';
      
      const rawText = `🛒 *Nuevo pedido desde CataloGo*\n\n👤 Cliente: ${buyerName.trim()}\n\n📦 Detalle:\n${itemsDetailText}\n\n💰 *Total estimado: ${formatGS(cartTotal)}*\n\n💬 Mensaje: ${buyerNote.trim() || 'Sin comentarios.'}\n\n---\nPedido generado desde: catalogopy.com/c/${slug}`;
      const whatsappText = encodeURIComponent(rawText);

      // 3. Extract WhatsApp Phone number starting with 595
      const cleanPhone = formatWhatsAppPhone(vendorProfile?.whatsapp || '595981234567');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappText}`;
      
      // Clear cart
      setCart([]);
      setIsCartOpen(false);
      setBuyerName('');
      setBuyerNote('');
      
      // Open WhatsApp link
      window.open(whatsappUrl, '_blank');
      
      // Route buyer to view order live tracking!
      onSetActiveOrderId(orderId);
      onSetView('tracker');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Filter Catalog
  const filteredProducts = visibleProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.category.toLowerCase().includes(search.toLowerCase()) ||
                          p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="marketplace-root" className="space-y-6">
      {/* Vendor Profile Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-emerald-500/5 to-transparent pointer-events-none" />

        {/* Brand Logo */}
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/10 overflow-hidden shadow-sm">
          {vendorProfile?.logoUrl ? (
            <img 
              src={vendorProfile.logoUrl} 
              alt={vendorProfile.businessName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Store className="w-10 h-10" />
          )}
        </div>

        {/* Profile Details */}
        <div className="space-y-2 text-center md:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white capitalize">
              {vendorProfile?.businessName || 'Catálogo de Demostración'}
            </h1>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/15">
              WhatsApp Activo
            </span>
          </div>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {vendorProfile?.description || 'Bienvenido a nuestro catálogo digital interactivo. Agrega los artículos de tu interés al carrito y confirma tu pedido para ponernos en contacto contigo directamente por WhatsApp de forma instantánea.'}
          </p>

          <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1.5 pt-1 text-[11px] font-medium text-slate-450 dark:text-slate-400">
            {vendorProfile?.city && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-emerald-505" />
                <span>📍 {vendorProfile.city} {vendorProfile.address ? ` — ${vendorProfile.address}` : ''}</span>
              </span>
            )}
            {vendorProfile?.ruc && (
              <span className="flex items-center gap-1 font-mono">
                <span>RUC: {vendorProfile.ruc}</span>
              </span>
            )}
          </div>
        </div>

        {/* View Cart Sticky Button */}
        <button 
          onClick={() => {
            if (cartItemCount > 0) setIsCartOpen(true);
          }}
          className="shrink-0 flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-emerald-500/10 transition cursor-pointer"
        >
          <ShoppingCart size={18} />
          <span>Ver mi Carrito</span>
          {cartItemCount > 0 && (
            <span className="absolute -top-2.5 -right-2 bg-red-500 border-2 border-slate-50 dark:border-slate-950 text-white font-black text-xs h-6 w-6 rounded-full flex items-center justify-center animate-bounce">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            id="market-search"
            type="text"
            placeholder="Buscar por nombre, etiquetas, categorías..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2 items-center w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap cursor-pointer transition ${
                selectedCategory === cat 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent'
              }`}
            >
              {cat === 'all' ? 'Ver Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Public Plan Product limits notice for testing convenience */}
      {activePlan === 'free' && products.length > 30 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/15 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex gap-2">
          <span>⚠️ <strong>Aviso del Catálogo:</strong> Este comercio opera bajo el Plan Free de CataloGo. Se muestran únicamente los primeros 30 productos.</span>
        </div>
      )}

      {/* Marketplace Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between"
          >
            <div 
              onClick={() => setDetailProduct(p)}
              className="h-48 bg-slate-100 dark:bg-slate-800 relative cursor-pointer overflow-hidden group"
            >
              <img 
                src={p.imageUrl} 
                alt={p.name} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105" 
              />
              <div className="absolute top-2 right-2 bg-slate-950/80 px-2 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                {p.category}
              </div>
              {p.stock === 0 && (
                <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-xs font-bold text-red-400 uppercase tracking-widest">
                  Agotado
                </div>
              )}
            </div>

            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-605 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Tag size={10} />
                  <span>{p.category}</span>
                </span>
                <h3 
                  onClick={() => setDetailProduct(p)}
                  className="font-bold text-slate-900 dark:text-white text-sm hover:underline cursor-pointer line-clamp-1"
                >
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {p.description ? p.description.replace(/[#*`-]/g, '') : 'Disponibilidad de stock garantizada para compra contra entrega.'}
                </p>
              </div>

              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/35 border border-slate-100 dark:border-slate-805 p-2 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-mono tracking-wider">Precio</span>
                  <span className="font-bold text-slate-900 dark:text-white text-base">{formatGS(p.price)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px] uppercase font-mono tracking-wider">Stock</span>
                  <span className={`font-semibold ${p.stock <= 5 ? 'text-amber-500 font-bold' : 'text-slate-600 dark:text-slate-350'}`}>
                    {p.stock > 0 ? `${p.stock} un.` : 'Sin stock'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => addToCart(p)}
                disabled={p.stock === 0}
                className="w-full h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                <ShoppingCart size={13} />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-450 dark:text-slate-500">
            <ShoppingBag className="mx-auto mb-3 text-slate-300" size={40} />
            <p className="text-sm font-semibold">No se encontraron productos en esta categoría.</p>
          </div>
        )}
      </div>

      {/* Cart Slider / Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 p-4">
          <motion.div 
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl h-full shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-emerald-500" size={18} />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Mi Carrito de Compras</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="p-1 rounded-full text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-850 transition cursor-pointer font-bold text-xl"
              >
                &times;
              </button>
            </div>

            {/* Scrollable list of items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.map((item) => (
                <div key={item.productId} className="flex gap-3 bg-slate-50 dark:bg-slate-800/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-805">
                  <div className="w-16 h-16 rounded-lg bg-slate-105 overflow-hidden shrink-0">
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between text-xs text-slate-700 dark:text-slate-350">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.productName}</h4>
                      <p className="text-slate-500 font-medium text-[11px] mt-0.5">{formatGS(item.price)} c/u</p>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-7 bg-white dark:bg-slate-900">
                        <button 
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="px-2 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-slate-400"
                        >
                          -
                        </button>
                        <span className="px-3 font-semibold text-slate-900 dark:text-white text-xs">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="px-2 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-slate-400"
                        >
                          +
                        </button>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-500 hover:underline hover:text-red-400 font-semibold cursor-pointer text-[11px]"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="text-slate-500 text-center py-16 text-sm">
                  <ShoppingCart size={32} className="mx-auto mb-2 text-slate-300" />
                  Tu carrito está totalmente vacío. ¡Agrega tus productos preferidos!
                </div>
              )}

              {/* Delivery Details Form */}
              {cart.length > 0 && (
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-850 pt-4 text-xs">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Información del Comprador</h4>
                  
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">Tu Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Ej: Nelson Zárate"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl py-2.5 px-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-505 uppercase tracking-wider block text-[10px]">Nota / Mensaje Opcional para el Comercio</label>
                    <textarea
                      rows={3}
                      value={buyerNote}
                      onChange={(e) => setBuyerNote(e.target.value)}
                      placeholder="Indica talles, colores, referencias o dirección de entrega..."
                      className="w-full bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-700 rounded-xl py-2 px-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Summary & Action */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                  <span>Total estimado</span>
                  <span className="text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">{formatGS(cartTotal)}</span>
                </div>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submittingOrder || !buyerName.trim()}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer shadow-md"
                >
                  {submittingOrder ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <MessageSquare size={16} />
                      <span>Confirmar Pedido vía WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
          >
            {/* Left side: Image */}
            <div className="w-full md:w-1/2 h-64 md:h-auto bg-slate-100 relative">
              <img src={detailProduct.imageUrl} alt={detailProduct.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                {detailProduct.category}
              </div>
            </div>

            {/* Right side: Info */}
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-snug">{detailProduct.name}</h3>
                  <button 
                    onClick={() => setDetailProduct(null)}
                    className="p-1 rounded-full text-slate-400 hover:bg-slate-105 hover:text-slate-700 dark:hover:bg-slate-800 transition cursor-pointer font-bold text-xl leading-none"
                  >
                    &times;
                  </button>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {detailProduct.tags?.map((tag, idx) => (
                    <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Product spec description */}
                <div className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed pr-2 max-h-44 overflow-y-auto">
                  {detailProduct.description ? (
                    <p className="whitespace-pre-line">{detailProduct.description}</p>
                  ) : (
                    <p>Ficha técnica pulida por el comercio con stock en tiempo real.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-805 text-xs">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-mono">Precio Unitario</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-lg">{formatGS(detailProduct.price)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-450 block text-[9px] uppercase tracking-wider font-mono">Stock</span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">{detailProduct.stock > 0 ? `${detailProduct.stock} unidades` : 'Sin stock'}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      addToCart(detailProduct);
                      setDetailProduct(null);
                    }}
                    disabled={detailProduct.stock === 0}
                    className="flex-1 h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-205 dark:disabled:bg-slate-800 disabled:text-slate-450 text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
                  >
                    <ShoppingCart size={14} />
                    <span>Añadir al Carrito</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
