import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, Clock, PackageCheck, AlertTriangle, 
  DollarSign, Box, BarChart2, ShieldCheck 
} from 'lucide-react';
import { Product, Order } from '../types';
import { motion } from 'motion/react';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  onSetView: (view: string) => void;
  aiAnalysis?: any;
  setAiAnalysis?: any;
  loadingAI?: any;
  setLoadingAI?: any;
}

export default function AdminDashboard({ 
  products, 
  orders, 
  onSetView
}: AdminDashboardProps) {

  // Compute stats
  const totalEarnings = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const deliveryRate = orders.length 
    ? Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100)
    : 100;

  const lowStockCount = products.filter(p => p.stock <= 5).length;

  // Compute category distributions
  const categoryCounts: { [key: string]: number } = {};
  products.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  return (
    <div id="admin-dashboard-root" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 id="dash-main-title" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Panel de Administración
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Resumen en tiempo real y análisis estratégico del mercado CataloGo.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ingresos Estimados</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">${totalEarnings.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-emerald-500">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={12} />
            <span>Excluye pedidos cancelados</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pedidos Pendientes</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{pendingOrdersCount}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg text-blue-500">
              <Clock size={20} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-slate-500">
            <span>Requieren procesamiento inmediato</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Productos</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{products.length}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg text-indigo-500">
              <Box size={20} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-indigo-600 dark:text-indigo-400">
            <span>En {Object.keys(categoryCounts).length} categorías</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tasa de Entrega</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{deliveryRate}%</h3>
            </div>
            <div className="p-3 bg-teal-500/10 dark:bg-teal-500/20 rounded-lg text-teal-500">
              <PackageCheck size={20} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-slate-500">
            <span>Pedidos con estado entregado</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Chart */}
      <div className="grid grid-cols-1 gap-6">
        {/* Custom Premium Visual Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <BarChart2 size={18} className="text-emerald-500" />
              <span>Tendencia de Ventas Recientes</span>
            </h3>
            <span className="text-[10px] font-mono tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded uppercase">Bespoke SVG</span>
          </div>

          <div className="h-60 w-full relative">
            {/* Elegant Custom SVGs with Grid lines */}
            <svg viewBox="0 0 500 240" className="w-full h-full text-slate-300 dark:text-slate-800">
              {/* Grid lines */}
              <line x1="50" y1="30" x2="480" y2="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50" y1="80" x2="480" y2="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50" y1="130" x2="480" y2="130" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50" y1="180" x2="480" y2="180" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50" y1="210" x2="480" y2="210" stroke="#94a3b8" strokeWidth="1" />

              {/* Dynamic Path matching orders */}
              {orders.length > 0 ? (
                <>
                  <path
                    d={`M 50 210 Q 120 180, 200 120 T 350 70 T 480 30`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Decorative glowing gradient area beneath */}
                  <path
                    d={`M 50 210 Q 120 180, 200 120 T 350 70 T 480 30 L 480 210 Z`}
                    fill="url(#grad)"
                    opacity="0.1"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Points */}
                  <circle cx="50" cy="210" r="5" fill="#10b981" />
                  <circle cx="200" cy="120" r="5" fill="#10b981" />
                  <circle cx="350" cy="70" r="5" fill="#14b8a6" />
                  <circle cx="480" cy="30" r="6" fill="#10b981" />
                </>
              ) : (
                <text x="250" y="120" textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 font-sans text-xs">
                  Procesa tus primeros pedidos para graficar tendencias
                </text>
              )}

              {/* X Axis Labels */}
              <text x="50" y="230" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">Semana 1</text>
              <text x="200" y="230" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">Semana 2</text>
              <text x="350" y="230" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">Semana 3</text>
              <text x="480" y="230" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">Semana 4</text>
            </svg>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Rendimiento escalable en base a pedidos totales</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Total: {orders.length} pedidos</span>
          </div>
        </div>
      </div>

      {/* Grid: Categories & Alerts list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
          <h4 className="font-bold text-slate-900 dark:text-white mb-4">Categorías de Catálogo</h4>
          {Object.keys(categoryCounts).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300 capitalize">{cat}</span>
                    <span className="text-slate-500">{count} {count === 1 ? 'producto' : 'productos'}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${(count / products.length) * 100}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No hay categorías registradas.</p>
          )}
        </div>

        {/* Warning Board */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
          <h4 className="font-bold text-slate-900 dark:text-white">Alertas de Inventario</h4>
          
          <div className="space-y-3">
            {lowStockCount > 0 ? (
              <div className="p-4 bg-amber-550/10 border border-amber-500/25 rounded-xl flex gap-3 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="shrink-0 text-amber-500 mt-0.5" size={16} />
                <div>
                  <p className="font-semibold">Bajo Stock Detectado</p>
                  <p className="mt-0.5">Tienes {lowStockCount} productos con 5 o menos unidades. Considera reabastecer para no perder pedidos.</p>
                  <button 
                    onClick={() => onSetView('catalog')}
                    className="mt-2 font-semibold hover:underline text-amber-600 dark:text-amber-300 block"
                  >
                    Ver catálogo &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex gap-3 text-xs text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="shrink-0 text-emerald-500 mt-0.5" size={16} />
                <div>
                  <p className="font-semibold">Inventario Saludable</p>
                  <p className="mt-0.5">Todos tus productos cuentan con stock suficiente para despachar ventas activas.</p>
                </div>
              </div>
            )}

            {orders.filter(o => o.status === 'pending').length > 0 && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/25 rounded-xl flex gap-3 text-xs text-blue-700 dark:text-blue-400">
                <Clock className="shrink-0 text-blue-500 mt-0.5" size={16} />
                <div>
                  <p className="font-semibold">Pedidos por Procesar</p>
                  <p className="mt-0.5">Tienes {orders.filter(o => o.status === 'pending').length} pedidos nuevos pendientes de confirmación.</p>
                  <button 
                    onClick={() => onSetView('orders')}
                    className="mt-2 font-semibold hover:underline text-blue-600 dark:text-blue-350 block"
                  >
                    Ver pedidos &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
