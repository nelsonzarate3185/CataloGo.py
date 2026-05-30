import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Check, Zap, Sparkles, Building2, AlertCircle, ShoppingBag, 
  Clock, ArrowUpCircle, BadgeAlert, Layers, Sliders 
} from 'lucide-react';
import { formatGS } from '../utils';
import { db, OperationType, handleFirestoreError, collection, onSnapshot, doc, setDoc, query, where, addDoc } from '../supabase';
import { PlanConfig, PlanRequest, UserProfile } from '../types';

interface SuscripcionManagerProps {
  currentPlan: string;
  productsCount: number;
  userId: string;
  vendorProfile: UserProfile | null;
}

export default function SuscripcionManager({ currentPlan, productsCount, userId, vendorProfile }: SuscripcionManagerProps) {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [vendorRequests, setVendorRequests] = useState<PlanRequest[]>([]);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch Plan templates dynamically
  useEffect(() => {
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      const list: PlanConfig[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PlanConfig);
      });
      // Sort plans by price
      list.sort((a, b) => a.price - b.price);
      setPlans(list);
    }, (err) => {
      console.warn("Using fallback local plan designs offline:", err);
      // Perfect static fallback matching the user instructions exactly
      setPlans([
        {
          id: 'free',
          name: 'Plan Gratuito',
          price: 0,
          productLimit: 5,
          description: 'Comienza hoy mismo con tu catálogo básico digital paraguayo.',
          features: [
            'Hasta 5 productos publicados',
            'Carrito de compras integrado',
            'Enlace directo a WhatsApp',
            'Soporte estándar por email'
          ]
        },
        {
          id: 'premium',
          name: 'Plan Premium',
          price: 120000,
          productLimit: 200,
          description: 'Potencia tu presencia y aumenta tus ventas.',
          features: [
            'Hasta 200 productos publicados',
            'Estadísticas del negocio en vivo',
            'Generador de descripción de productos con IA',
            'Generador de imágenes con IA integrado',
            'Soporte prioritario 24/7 vía WhatsApp'
          ]
        },
        {
          id: 'business',
          name: 'Plan Business',
          price: 250000,
          productLimit: 99999,
          description: 'La solución corporativa definitiva para grandes comercios.',
          features: [
            'Productos ILIMITADOS',
            'Consultoría estratégica de negocios con IA',
            'Múltiples administradores elegibles',
            'Integración de píxeles publicitarios de Meta y analíticas avanzada'
          ]
        }
      ]);
    });

    return () => unsubPlans();
  }, []);

  // 2. Fetch current merchant's historical requests in real-time
  useEffect(() => {
    const qRequests = query(collection(db, 'plan_requests'), where('vendorId', '==', userId));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      const list: PlanRequest[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PlanRequest);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setVendorRequests(list);
    }, (err) => {
      console.warn("Requests retrieval fallbacked.");
    });

    return () => unsubRequests();
  }, [userId]);

  // 3. Initiate an upgrade request
  const handleRequestUpgrade = async (targetPlan: PlanConfig) => {
    setLoadingPlanId(targetPlan.id);
    setSuccessMessage('');
    setErrorMessage('');

    // Check if there's already a pending request for the same plan
    const alreadyPending = vendorRequests.some(
      req => req.requestedPlanId === targetPlan.id && req.status === 'pending'
    );

    if (alreadyPending) {
      setErrorMessage(`Ya cuentas con una solicitud pendiente de revisión para el ${targetPlan.name}.`);
      setLoadingPlanId(null);
      return;
    }

    const newRequestId = 'req_' + Math.random().toString(36).substring(2, 11);
    const newRequestPayload: PlanRequest = {
      id: newRequestId,
      vendorId: userId,
      vendorName: vendorProfile?.businessName || vendorProfile?.displayName || 'Mi Comercio',
      vendorEmail: vendorProfile?.email || 'vendedor@catalogogo.com',
      requestedPlanId: targetPlan.id,
      requestedPlanName: targetPlan.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'plan_requests', newRequestId);
      await setDoc(docRef, newRequestPayload);
      setSuccessMessage(`¡Solicitud enviada con éxito! El Propietario de la plataforma revisará tu solicitud de upgrade para el ${targetPlan.name} a la brevedad.`);
    } catch (err) {
      console.error(err);
      setErrorMessage("No se pudo enviar la solicitud de actualización. Por favor inténtalo de nuevo.");
    } finally {
      setLoadingPlanId(null);
    }
  };

  // Locate current plan specifications to extract its limits
  const currentPlanSpec = plans.find(p => p.id === currentPlan) || {
    id: 'free',
    name: 'Plan Gratuito',
    productLimit: 5,
    price: 0
  };

  // Core limit warnings
  const hasExceededLimit = productsCount > currentPlanSpec.productLimit;

  return (
    <div id="subscription-manager-workspace" className="space-y-8">
      {/* Introduction banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Estado de mi Suscripción</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Control de límites de publicación, pasarela de WhatsApp transparente y planes adaptables para crecer.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck size={14} />
          <span className="capitalize">Plan Activo: {currentPlanSpec.name}</span>
        </div>
      </div>

      {/* Exceed warnings */}
      {hasExceededLimit && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-700 dark:text-amber-400 text-xs flex gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Límite de productos excedido</p>
            <p>
              Tu plan actual ({currentPlanSpec.name}) permite hasta <strong>{currentPlanSpec.productLimit} productos activos</strong>, pero tienes <strong>{productsCount} productos</strong> creados.
              Los excedentes no se visualizarán en tu catálogo público para compradores. Solicita un upgrade para habilitar su visibilidad.
            </p>
          </div>
        </div>
      )}

      {/* Response messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <Check size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs flex items-center gap-2">
          <BadgeAlert size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active upgrades list notifications */}
      {vendorRequests.filter(r => r.status === 'pending').map((req) => (
        <div key={req.id} className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-indigo-400 animate-pulse shrink-0" />
            <div>
              <p className="font-semibold">Solicitud de Upgrade en revisión</p>
              <p className="text-[11px] text-slate-400">Has enviado una solicitud para cambiar al <strong>{req.requestedPlanName}</strong>. El propietario de la plataforma la revisará pronto.</p>
            </div>
          </div>
          <span className="bg-indigo-500/10 text-[10px] px-2.5 py-1 rounded-lg border border-indigo-500/10 text-indigo-400 uppercase font-mono tracking-wider font-extrabold shrink-0">
            Pendiente de aprobación
          </span>
        </div>
      ))}

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((opt) => {
          const isCurrent = currentPlan === opt.id;
          const isPending = vendorRequests.some(r => r.requestedPlanId === opt.id && r.status === 'pending');

          return (
            <div
              key={opt.id}
              className={`border rounded-2xl p-6 flex flex-col justify-between space-y-6 transition relative ${
                isCurrent 
                  ? 'border-emerald-500/50 bg-emerald-500/[0.02] ring-1 ring-emerald-500/20' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className={`p-2 rounded-xl text-xs font-bold leading-none ${
                    isCurrent ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {opt.id.toUpperCase()}
                  </span>
                  
                  {isCurrent && (
                    <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-500/20">
                      Activo
                    </span>
                  )}
                  {isPending && (
                    <span className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-indigo-500/20 animate-pulse">
                      En espera
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white capitalize">{opt.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400">{opt.description}</p>
                </div>

                <div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {opt.price === 0 ? 'Gratuito' : formatGS(opt.price)}
                  </span>
                  {opt.price > 0 && <span className="text-[10px] text-slate-400 tracking-wide"> / mes</span>}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 font-sans space-y-2">
                  <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1">
                    <Sliders size={10} />
                    <span>Límites y Accesos:</span>
                  </p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                    <li className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      <Check size={12} className="text-emerald-500 shrink-0" />
                      <span>
                        Límite: {opt.productLimit === 99999 ? 'Productos ILIMITADOS' : `Hasta ${opt.productLimit} productos publicados`}
                      </span>
                    </li>
                    {opt.features?.map((ft, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400">
                        <Check size={12} className="text-slate-350 dark:text-slate-650 shrink-0 mt-0.5" />
                        <span>{ft}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                disabled={isCurrent || isPending || loadingPlanId !== null}
                onClick={() => handleRequestUpgrade(opt)}
                className={`w-full h-10 flex items-center justify-center rounded-xl text-xs font-extrabold cursor-pointer transition ${
                  isCurrent 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : isPending
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                }`}
              >
                {loadingPlanId === opt.id ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isCurrent ? (
                  'Plan Actualmente Activo'
                ) : isPending ? (
                  'Upgrade Solicitado'
                ) : (
                  `Solicitar Upgrade`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Historial de solicitudes */}
      {vendorRequests.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Historial de Solicitudes</h4>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
            {vendorRequests.map((req) => (
              <div key={req.id} className="p-4 flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-205">Solicitud de plan {req.requestedPlanName}</p>
                  <p className="text-[10px] text-slate-400">Enviada: {new Date(req.createdAt).toLocaleDateString('es-PY')} • {new Date(req.createdAt).toLocaleTimeString('es-PY', {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  req.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                  req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  {req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
