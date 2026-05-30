import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, Clock, Truck, ShoppingBag, ShieldAlert, ArrowLeft, 
  Search, ExternalLink, RefreshCw, MessageCircle, AlertCircle
} from 'lucide-react';
import { Order } from '../types';
import { db, OperationType, handleFirestoreError, doc, updateDoc, onSnapshot, collection, query, where } from '../supabase';
import { formatGS } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface OrderTrackerProps {
  currentUser: any;
  isAdminMode: boolean; // True means Seller is viewing orders received, False means Buyer is tracking theirs
  activeOrderId: string | null;
  onSetActiveOrderId: (id: string | null) => void;
  vendorId?: string | null;
}

export default function OrderTracker({ currentUser, isAdminMode, activeOrderId, onSetActiveOrderId, vendorId }: OrderTrackerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Status lists in Spanish for display and mapping
  const statusConfig = {
    pending: { label: 'Pendiente', color: 'text-amber-600 bg-amber-500/10 border-amber-500/15', step: 1 },
    processing: { label: 'En Proceso', color: 'text-blue-600 bg-blue-500/10 border-blue-500/15', step: 2 },
    shipped: { label: 'Despachado', color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/15', step: 3 },
    delivered: { label: 'Entregado', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/15', step: 4 },
    cancelled: { label: 'Cancelado', color: 'text-red-600 bg-red-500/10 border-red-500/15', step: 0 },
  };

  // Sync active orders in real-time
  useEffect(() => {
    setLoading(true);
    let q;
    
    if (isAdminMode) {
      // Seller sees orders matching their own vendorId (current logged user unique id!)
      q = query(
        collection(db, 'orders'),
        where('vendorId', '==', currentUser?.uid || 'all_vendors')
      );
    } else {
      // Anonymous Buyer sees only their active session order id or searched id if specified!
      q = collection(db, 'orders');
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Order);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // If buyer, filter to show only activeOrderId initially unless searched, or match their unique registered buyerUid
      const isRealUser = currentUser && !currentUser.uid?.startsWith('guest_');
      const filtered = isAdminMode 
        ? list 
        : list.filter(o => 
            o.id === activeOrderId || 
            o.id === searchOrderId || 
            (isRealUser && o.buyerUid === currentUser.uid)
          );
      setOrders(filtered);
      setLoading(false);

      // Auto sync selected order if currently visualized
      if (activeOrderId) {
        const found = list.find(o => o.id === activeOrderId);
        if (found) {
          setSelectedOrder(found);
        }
      } else if (filtered.length > 0 && !selectedOrder) {
        setSelectedOrder(filtered[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [currentUser?.uid, isAdminMode, activeOrderId, searchOrderId]);

  // Set selected order
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    onSetActiveOrderId(order.id);
  };

  // Status updater for admin!
  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  // Buyer cancels pending order directly
  const handleCancelOrderByBuyer = async (orderId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar este pedido en el comercio?')) return;
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const getStepClass = (currentStep: number, stepIndex: number, status: string) => {
    if (status === 'cancelled') return 'bg-red-200 border-red-300 text-red-750';
    if (currentStep >= stepIndex) return 'bg-emerald-600 border-emerald-650 text-white';
    return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400';
  };

  return (
    <div id="order-tracker-root" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs lg:col-span-1 space-y-4">
        <div>
          <h3 className="font-bold text-slate-905 dark:text-white text-base">
            {isAdminMode ? 'Gestión de Pedidos' : 'Rastreador de Pedidos'}
          </h3>
          <p className="text-xs text-slate-550 mt-0.5">Sincronización instantánea de estados.</p>
        </div>

        {/* Local tracking search bar */}
        {!isAdminMode && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Código de Pedido</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Ej: order_..."
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-950 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
          {loading ? (
            <div className="space-y-2 py-4">
              <div className="h-10 bg-slate-105 dark:bg-slate-800 animate-pulse rounded-lg" />
              <div className="h-10 bg-slate-105 dark:bg-slate-800 animate-pulse rounded-lg" />
            </div>
          ) : orders.length > 0 ? (
            orders.map((order) => {
              const conf = statusConfig[order.status] || statusConfig.pending;
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-3 border rounded-xl cursor-pointer transition flex justify-between items-center text-xs ${
                    isSelected 
                      ? 'border-emerald-500/40 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02]' 
                      : 'border-slate-100 dark:border-slate-805 bg-slate-50/25 hover:bg-slate-55 dark:hover:bg-slate-850'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      <span>#{order.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'} • {formatGS(order.total)}
                    </p>
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                      Cliente: {order.buyerName}
                    </p>
                  </div>

                  <div className="text-right space-y-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${conf.color}`}>
                      {conf.label}
                    </span>
                    
                    {isAdminMode && (
                      <select
                        value={order.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value as Order['status'])}
                        className="block text-[10px] bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 py-1 px-1.5 rounded-md text-slate-700 dark:text-slate-300 pointer-events-auto cursor-pointer"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="processing">Procesando</option>
                        <option value="shipped">Despachado</option>
                        <option value="delivered">Entregado</option>
                        <option value="cancelled">Cancelar</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              {isAdminMode ? 'No has recibido pedidos todavía.' : 'Ingresa el ID de tu pedido para rastrearlo.'}
            </div>
          )}
        </div>
      </div>

      {/* Tracker Visual Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs lg:col-span-2 space-y-6">
        {selectedOrder ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/15 px-2.5 py-0.5 rounded uppercase font-mono">
                  Sincronizado Activo
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-2">
                  Pedido #{selectedOrder.id.toUpperCase()}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  Fecha: {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-450 tracking-wide font-medium">Total Estimado</span>
                <p className="text-xl font-bold text-slate-905 dark:text-white mt-1">
                  {formatGS(selectedOrder.total)}
                </p>
              </div>
            </div>

            {/* Progress Bar Timeline */}
            <div className="py-6 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-6 uppercase tracking-wider text-slate-400">Progreso del Despacho</h4>

              {selectedOrder.status === 'cancelled' ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-655 dark:text-red-400 text-xs font-bold">
                  <AlertCircle size={15} />
                  <span>Este pedido figura como Cancelado.</span>
                </div>
              ) : (
                <div className="flex justify-between items-center relative pr-4">
                  {/* Absolute linking bar */}
                  <div className="absolute top-4 left-5 right-11 h-1 bg-slate-100 dark:bg-slate-800 pointer-events-none -z-0">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300" 
                      style={{ 
                        width: `${
                          Math.max(0, Math.min(100, ((statusConfig[selectedOrder.status]?.step - 1) / 3) * 100))
                        }%` 
                      }} 
                    />
                  </div>

                  <div className="z-10 flex flex-col items-center space-y-2 text-center text-[10px]">
                    <div className={`w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center transition ${getStepClass(statusConfig[selectedOrder.status]?.step, 1, selectedOrder.status)}`}>
                      <Clock size={16} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-350">Confirmado</span>
                  </div>

                  <div className="z-10 flex flex-col items-center space-y-2 text-center text-[10px]">
                    <div className={`w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center transition ${getStepClass(statusConfig[selectedOrder.status]?.step, 2, selectedOrder.status)}`}>
                      <ShoppingBag size={16} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-350">Procesando</span>
                  </div>

                  <div className="z-10 flex flex-col items-center space-y-2 text-center text-[10px]">
                    <div className={`w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center transition ${getStepClass(statusConfig[selectedOrder.status]?.step, 3, selectedOrder.status)}`}>
                      <Truck size={16} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-350">Despachado</span>
                  </div>

                  <div className="z-10 flex flex-col items-center space-y-2 text-center text-[10px]">
                    <div className={`w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center transition ${getStepClass(statusConfig[selectedOrder.status]?.step, 4, selectedOrder.status)}`}>
                      <CheckCircle size={16} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-350">Entregado</span>
                  </div>
                </div>
              )}
            </div>

            {/* Info logs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-650 dark:text-slate-350 pt-2">
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-slate-400">Datos del Cliente</h4>
                <div className="bg-slate-50/50 dark:bg-slate-805 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-810 leading-relaxed">
                  <p><strong className="text-slate-900 dark:text-white">Nombre:</strong> {selectedOrder.buyerName}</p>
                  <p><strong className="text-slate-900 dark:text-white">ID de Pedido para Reclamos:</strong> <span className="font-mono bg-slate-105 px-1 py-0.5 rounded text-indigo-650 dark:text-indigo-405">{selectedOrder.id}</span></p>
                  <p><strong className="text-slate-900 dark:text-white">Nota / Mensaje:</strong> {selectedOrder.buyerNote || 'Sin comentarios.'}</p>
                  
                  {!isAdminMode && selectedOrder.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrderByBuyer(selectedOrder.id)}
                      className="mt-3 block text-red-500 hover:underline font-bold text-[11px]"
                    >
                      Cancelar mi pedido &times;
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-slate-400">Items Comprados</h4>
                <div className="bg-slate-50/50 dark:bg-slate-850 p-4 rounded-xl space-y-2 max-h-44 overflow-y-auto border border-slate-100 dark:border-slate-815">
                  {selectedOrder.items.map((it, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                      <span className="font-medium text-slate-800 dark:text-slate-300">{it.productName} (x{it.quantity})</span>
                      <span className="font-bold text-slate-950 dark:text-white">{formatGS(it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-450 dark:text-slate-500 text-xs">
            <Clock size={36} className="text-emerald-500 mb-3 animate-bounce" />
            <p>Selecciona un pedido de la lista para ver el progreso del despacho.</p>
          </div>
        )}
      </div>
    </div>
  );
}
