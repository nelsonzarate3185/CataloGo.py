import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Check, X, RefreshCw, Layers, Edit, Trash2, Plus, 
  Sparkles, Sliders, ListOrdered, AlertTriangle, CreditCard, User, Tag,
  Users, UserX, UserCheck, ShieldAlert, Store, ShoppingBag
} from 'lucide-react';
import { PlanConfig, PlanRequest, UserProfile } from '../types';
import { db, OperationType, handleFirestoreError, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from '../supabase';
import { formatGS } from '../utils';

interface SuperAdminPanelProps {
  currentUserId: string;
}

export default function SuperAdminPanel({ currentUserId }: SuperAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'plans' | 'users'>('requests');
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Users state management
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Form states for managing dynamic plans
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
  
  const [planId, setPlanId] = useState('');
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planProductLimit, setPlanProductLimit] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planFeatures, setPlanFeatures] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter & Search states for users directory
  const [userSearchText, setUserSearchText] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'pending_approval' | 'blocked' | 'blocked_unpaid' | 'suspended'>('all');

  // Non-blocking in-app notifications and custom interactive confirmation Dialog
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 1. Fetch Plan Requests in Realtime
  useEffect(() => {
    const unsubRequests = onSnapshot(collection(db, 'plan_requests'), (snap) => {
      const list: PlanRequest[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PlanRequest);
      });
      // Sort newest requests first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(list);
      setIsLoading(false);
    }, (err) => {
      console.warn("Failed fetching plan requests:", err);
      // Fallback local structures if offline
      setRequests([
        {
          id: "req_demo_1",
          vendorId: "vendor_123",
          vendorName: "Zapatería Nelson S.A.",
          vendorEmail: "nelsonzarate3185@gmail.com",
          requestedPlanId: "premium",
          requestedPlanName: "Plan Premium",
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
      setIsLoading(false);
    });

    return () => unsubRequests();
  }, []);

  // 2. Fetch Plan Templates in Realtime
  useEffect(() => {
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      const list: PlanConfig[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PlanConfig);
      });
      // Sort by price
      list.sort((a, b) => a.price - b.price);
      setPlans(list);
    }, (err) => {
      console.warn("Failed fetching plans configurations:", err);
      // Fallback local dynamic plans list (pre-seeded)
      setPlans([
        {
          id: "free",
          name: "Plan Free",
          price: 0,
          productLimit: 5,
          description: "Prueba inicial para micro-emprendedores paraguayos.",
          features: ["Hasta 5 productos activos", "Carrito Whatsapp", "1 Catálogo dinámico"]
        },
        {
          id: "premium",
          name: "Plan Premium",
          price: 120000,
          productLimit: 200,
          description: "Potencia tus ventas y escala sin barreras en todo el país.",
          features: ["Hasta 200 productos activos", "Estadísticas del negocio", "Soporte prioritario PY"]
        },
        {
          id: "unlimited",
          name: "Plan Pro Business",
          price: 250000,
          productLimit: 99999,
          description: "Infraestructura corporativa para locales consolidados.",
          features: ["Productos ILIMITADOS", "Dominio .py", "Multi-sucursal", "Soporte 24/7"]
        }
      ]);
    });

    return () => unsubPlans();
  }, []);

  // 2.5 Fetch Users and Products List (Unconditional for Platform Metrics Dashboard)
  useEffect(() => {
    setUsersLoading(true);
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uList: UserProfile[] = [];
      snap.forEach((d) => {
        uList.push({ uid: d.id, ...d.data() } as UserProfile);
      });
      setUsers(uList);
      setUsersLoading(false);
    }, (err) => {
      console.warn("Failed fetching users collection:", err);
      setUsersLoading(false);
    });

    const unsubProds = onSnapshot(collection(db, 'products'), (snap) => {
      const pList: any[] = [];
      snap.forEach((d) => {
        pList.push({ id: d.id, ...d.data() });
      });
      setAllProducts(pList);
    }, (err) => {
      console.warn("Failed fetching products collection:", err);
    });

    return () => {
      unsubUsers();
      unsubProds();
    };
  }, []);

  const handleUpdateUserStatus = (
    uid: string, 
    newStatus: 'blocked' | 'active' | 'pending_approval' | 'blocked_unpaid' | 'suspended'
  ) => {
    const statusLabels: Record<string, string> = {
      active: 'ACTIVO (Habilitado)',
      pending_approval: 'PENDIENTE DE APROBACIÓN',
      blocked: 'BLOQUEADO (General / Infracción)',
      blocked_unpaid: 'BLOQUEADO (Falta de Pago de Suscripción)',
      suspended: 'DADO DE BAJA / SUSPENDIDO'
    };

    setConfirmModal({
      isOpen: true,
      title: 'Cambiar Estado de Cuenta',
      message: `¿Estás seguro de que quieres cambiar el estado de este usuario a ${statusLabels[newStatus]}?`,
      type: newStatus === 'active' ? 'success' : newStatus === 'blocked_unpaid' ? 'warning' : 'danger',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', uid), {
            status: newStatus,
            updatedAt: new Date().toISOString()
          });
          showToast(`¡El estado se ha cambiado a ${statusLabels[newStatus]} exitosamente!`, 'success');
        } catch (err: any) {
          console.error("Error setting user level security status:", err);
          showToast(`Error modificando la cuenta: ${err.message}`, 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  // 3. Approve Request Handler
  const handleApproveRequest = (req: PlanRequest) => {
    setConfirmModal({
      isOpen: true,
      title: 'Aprobar Upgrade de Plan',
      message: `¿Estás seguro de que quieres aprobar el upgrade al plan "${req.requestedPlanName}" solicitado por el comercio "${req.vendorName}"?`,
      type: 'success',
      onConfirm: async () => {
        try {
          // Step A: Update the Request Status to 'approved'
          const reqRef = doc(db, 'plan_requests', req.id);
          await updateDoc(reqRef, {
            status: 'approved',
            updatedAt: new Date().toISOString()
          });

          // Step B: Update the Seller profile
          const userRef = doc(db, 'users', req.vendorId);
          await updateDoc(userRef, {
            plan: req.requestedPlanId,
            updatedAt: new Date().toISOString()
          });

          showToast(`¡Solicitud aprobada! El plan de ${req.vendorName} se ha actualizado a: ${req.requestedPlanId.toUpperCase()}`, 'success');
        } catch (err: any) {
          console.error("Error approving plan request:", err);
          showToast(`Error procesando aprobación: ${err.message || String(err)}`, 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  // 4. Reject Request Handler
  const handleRejectRequest = (req: PlanRequest) => {
    setConfirmModal({
      isOpen: true,
      title: 'Rechazar Solicitud de Plan',
      message: `¿Estás seguro de que deseas rechazar la solicitud de cambio de plan de ${req.vendorName}?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const reqRef = doc(db, 'plan_requests', req.id);
          await updateDoc(reqRef, {
            status: 'rejected',
            updatedAt: new Date().toISOString()
          });
          showToast(`La solicitud de plan ha sido rechazada para ${req.vendorName}`, 'info');
        } catch (err: any) {
          console.error("Error rejecting plan request:", err);
          showToast(`Error rechazando la solicitud: ${err.message || String(err)}`, 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  // 5. Open Modal to Create/Edit Plan Configurations
  const handleOpenPlanForm = (plan?: PlanConfig) => {
    setErrorMsg('');
    if (plan) {
      setEditingPlan(plan);
      setPlanId(plan.id);
      setPlanName(plan.name);
      setPlanPrice(plan.price.toString());
      setPlanProductLimit(plan.productLimit.toString());
      setPlanDescription(plan.description);
      setPlanFeatures(plan.features.join('\n'));
    } else {
      setEditingPlan(null);
      setPlanId('');
      setPlanName('');
      setPlanPrice('');
      setPlanProductLimit('');
      setPlanDescription('');
      setPlanFeatures('');
    }
    setIsPlanFormOpen(true);
  };

  // 6. Save/Update Dynamic Plan Template to DB
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId || !planName || !planPrice || !planProductLimit) {
      setErrorMsg('Por favor completa todos los campos requeridos (*).');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    const formattedFeatures = planFeatures
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const updatedPlan: PlanConfig = {
      id: planId.toLowerCase().trim(),
      name: planName,
      price: parseFloat(planPrice) || 0,
      productLimit: parseInt(planProductLimit) || 0,
      description: planDescription,
      features: formattedFeatures
    };

    try {
      const planRef = doc(db, 'plans', updatedPlan.id);
      await setDoc(planRef, updatedPlan);
      setIsPlanFormOpen(false);
    } catch (err: any) {
      setErrorMsg("Error guardando el plan: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Delete Dynamic Plan Template from DB
  const handleDeletePlan = (id: string) => {
    if (id === 'free') {
      showToast("No puedes eliminar el Plan Básico obligatorio.", 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Tipo de Plan',
      message: '¿Estás seguro de que deseas eliminar este tipo de plan? Los comercios con este plan perderán su referencia de cotización y límites.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'plans', id));
          showToast("¡El tipo de plan se ha eliminado de la base de datos!", 'success');
        } catch (err: any) {
          console.error(err);
          showToast(`Error eliminando plan: ${err.message || String(err)}`, 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  // Platform-wide calculations for Dashboard
  const sellers = users.filter(u => u.role === 'admin' || u.role === 'super_admin');
  const activeSellersCount = sellers.filter(u => u.status === 'active' || !u.status).length;
  const pendingSellersCount = sellers.filter(u => u.status === 'pending_approval').length;
  const blockedSellersCount = sellers.filter(u => u.status === 'blocked').length;
  const unpaidSellersCount = sellers.filter(u => u.status === 'blocked_unpaid').length;
  const suspendedSellersCount = sellers.filter(u => u.status === 'suspended').length;
  
  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter(p => {
    const owner = users.find(u => u.uid === (p.vendorId || p.ownerId));
    return !owner || owner.status === 'active' || !owner.status;
  });

  const planDistribution = sellers.reduce((acc, u) => {
    const pId = u.plan || 'free';
    acc[pId] = (acc[pId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalEstimatedMonthlyRevenue = sellers.reduce((sum, u) => {
    if (u.status !== 'active' && u.status !== undefined) return sum;
    const planSpec = plans.find(p => p.id === (u.plan || 'free'));
    return sum + (planSpec?.price || 0);
  }, 0);

  return (
    <div id="super-admin-root" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">
              Consola del Propietario (Super Admin)
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Panel de Control CataloGo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra solicitudes de upgrades, configura límites, libera capacidades y escala los planes globales de la plataforma.
          </p>
        </div>

        <button 
          onClick={() => handleOpenPlanForm()}
          className="flex items-center gap-2 text-xs bg-indigo-650 hover:bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl shadow cursor-pointer transition-colors"
        >
          <Plus size={14} />
          <span>Crear Tipo de Plan</span>
        </button>
      </div>

      {/* Real-time Platform Statistics Grid */}
      <div id="metrics-dashboard" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in font-sans">
        {/* Card 1: Sellers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Comercios / Vendedores</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-950 dark:text-white leading-none">{sellers.length}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Sellers registrados en la plataforma</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-4 gap-1 text-center text-[9px]">
            <div>
              <span className="block font-extrabold text-emerald-500">{activeSellersCount}</span>
              <span className="text-slate-400">Activo</span>
            </div>
            <div>
              <span className="block font-extrabold text-amber-500">{pendingSellersCount}</span>
              <span className="text-slate-400">Pend.</span>
            </div>
            <div>
              <span className="block font-extrabold text-yellow-600">{unpaidSellersCount}</span>
              <span className="text-slate-400">Mora</span>
            </div>
            <div>
              <span className="block font-extrabold text-rose-600">{blockedSellersCount + suspendedSellersCount}</span>
              <span className="text-slate-400">Baja</span>
            </div>
          </div>
        </div>

        {/* Card 2: Plans Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Distribución de Planes</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Layers size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-950 dark:text-white leading-none">
              {(Object.values(planDistribution) as number[]).reduce((a, b) => a + b, 0)}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Sellers por tipos de planes</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1 text-[8px] text-slate-400">
            {plans.map(p => {
              const count = planDistribution[p.id] || 0;
              return (
                <span key={p.id} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">
                  {p.name}: <strong className="text-indigo-400">{count}</strong>
                </span>
              );
            })}
          </div>
        </div>

        {/* Card 3: Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Productos Publicados</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ShoppingBag size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-950 dark:text-white leading-none">{totalProducts}</h3>
            <p className="text-[10px] text-slate-405 mt-1">Artículos registrados en total</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-1 text-center text-[10px]">
            <div>
              <span className="block font-extrabold text-emerald-500">{activeProducts.length}</span>
              <span className="text-[9px] text-slate-400">De Activos</span>
            </div>
            <div>
              <span className="block font-extrabold text-slate-400">{totalProducts - activeProducts.length}</span>
              <span className="text-[9px] text-slate-400 font-medium">De Inactivos</span>
            </div>
          </div>
        </div>

        {/* Card 4: Monthly Recurring Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Recaudación Estimada</span>
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
              <CreditCard size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-950 dark:text-white leading-none">{formatGS(totalEstimatedMonthlyRevenue)}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Previsión por Comercios Activos</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-1 text-center text-[9px] text-slate-400">
            <div className="border-r border-slate-100 dark:border-slate-800/60 font-medium">
              <span className="block font-bold text-amber-500">{unpaidSellersCount} en mora</span>
              <span className="text-[8px] text-slate-400">Suscripción Bloqueada</span>
            </div>
            <div className="font-medium">
              <span className="block font-bold text-indigo-400">{requests.filter(r => r.status === 'pending').length} nuevos</span>
              <span className="text-[8px] text-slate-400">Upgrades por Procesar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-4">
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'requests' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard size={15} />
          <span>Solicitudes de Planes ({requests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'plans' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={15} />
          <span>Estructura de Planes ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'users' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users size={15} />
          <span>Vendedores y Usuarios</span>
        </button>
      </div>

      {/* Requests screen */}
      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Upgrade de Planes Solicitados</h3>
            <span className="text-[10px] font-mono text-slate-400">Total Solicitudes: {requests.length}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="p-8 text-center text-slate-450 text-xs">Cargando solicitudes...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No hay solicitudes de planes pendientes de revisión en este momento.
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{req.vendorName}</span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        req.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {req.vendorEmail}
                      </span>
                      <span>•</span>
                      <span>Solicitó: <strong className="text-indigo-400">{req.requestedPlanName}</strong></span>
                      <span>•</span>
                      <span>Iniciada: {new Date(req.createdAt).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 self-end md:self-auto">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApproveRequest(req)}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Aprobar / Liberar</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req)}
                          className="flex items-center gap-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer"
                        >
                          <X size={14} />
                          <span>Rechazar</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Procesada</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Plans configuration tab */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                      <Sliders size={16} />
                    </span>
                    <h4 className="font-extrabold text-slate-900 dark:text-white">{p.name}</h4>
                  </div>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-205 dark:border-slate-700 font-bold px-2.5 py-0.5 rounded-full capitalize">
                    Limit: {p.productLimit === 99999 ? 'Ilimitado' : `${p.productLimit} prods`}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{p.description}</p>

                <div className="pt-1.5">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {p.price === 0 ? 'Gratis' : formatGS(p.price)}
                  </span>
                  <span className="text-[10px] text-slate-400"> / mes</span>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                  <p className="text-[10px] font-bold text-slate-450 uppercase">Atributos del plan:</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    {p.features?.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check size={11} className="text-emerald-500 block shrink-0" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/30">
                <button
                  onClick={() => handleOpenPlanForm(p)}
                  className="flex-1 h-9 flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 hover:bg-slate-55 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <Edit size={12} />
                  <span>Configurar</span>
                </button>
                {p.id !== 'free' && (
                  <button
                    onClick={() => handleDeletePlan(p.id)}
                    className="p-2 border border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users management tab */}
      {activeTab === 'users' && (() => {
        // Filter users based on Search and Status Filter
        const filteredUsers = users.filter((u) => {
          const searchLower = userSearchText.toLowerCase();
          const matchesSearch = 
            (u.displayName || '').toLowerCase().includes(searchLower) ||
            (u.email || '').toLowerCase().includes(searchLower) ||
            (u.businessName || '').toLowerCase().includes(searchLower) ||
            (u.slug || '').toLowerCase().includes(searchLower);

          let matchesStatus = true;
          if (userStatusFilter !== 'all') {
            const currentStatus = u.status || 'active';
            matchesStatus = currentStatus === userStatusFilter;
          }

          return matchesSearch && matchesStatus;
        });

        return (
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Directorio de Usuarios y Comercios</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Control regional de estados de cuenta (Dar de baja, falta de pago o bloqueo).</p>
              </div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-bold px-2.5 py-1 rounded-full self-start sm:self-auto">
                Registrados: {users.length} | Filtrados: {filteredUsers.length}
              </span>
            </div>

            {/* Filter controls */}
            <div className="px-5 pb-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search text input */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">Buscar Comercio / Vendedor</label>
                <input
                  type="text"
                  value={userSearchText}
                  onChange={(e) => setUserSearchText(e.target.value)}
                  placeholder="ej: Zapatería, nelsonzarate..."
                  className="w-full h-9 bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700/80 rounded-lg py-1 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status Select filter */}
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block font-sans">Filtrar por Diagnóstico de Cuenta</label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {(['all', 'active', 'pending_approval', 'blocked_unpaid', 'suspended', 'blocked'] as const).map((st) => {
                    const labelMap: Record<string, string> = {
                      all: 'Todos',
                      active: 'Activos',
                      pending_approval: 'Pendientes Alta',
                      blocked_unpaid: 'Mora Pago 💸',
                      suspended: 'De Baja 🛑',
                      blocked: 'Infracción / Bloqueados'
                    };
                    const isActive = userStatusFilter === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setUserStatusFilter(st)}
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg border transition ${
                          isActive 
                            ? 'bg-indigo-650 text-white border-indigo-600' 
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {labelMap[st]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 font-sans border-t border-slate-100 dark:border-slate-800">
              {usersLoading ? (
                <div className="p-8 text-center text-slate-450 text-xs">Cargando directorio de usuarios...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No se encontraron usuarios con los criterios de búsqueda y filtros seleccionados.
                </div>
              ) : (
                filteredUsers.map((ul) => {
                  const isNelson = ul.email === "nelsonzarate3185@gmail.com" || ul.role === 'super_admin';
                  const userProds = allProducts.filter(p => p.vendorId === ul.uid || p.ownerId === ul.uid);
                  const activePlanSpec = plans.find(p => p.id === (ul.plan || 'free'));
                  const curPlanName = activePlanSpec?.name || 'Plan Gratuito';
                  const curPlanLimit = activePlanSpec?.productLimit || 5;

                  return (
                    <div key={ul.uid} className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition">
                      <div className="flex items-start gap-3.5">
                        {/* Avatar */}
                        <div className="relative shrink-0 mt-0.5">
                          <img 
                            src={ul.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'} 
                            alt={ul.displayName}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover border border-slate-205 dark:border-slate-850"
                          />
                          <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            ul.status === 'blocked' ? 'bg-red-500' :
                            ul.status === 'blocked_unpaid' ? 'bg-amber-500 animate-pulse' :
                            ul.status === 'suspended' ? 'bg-rose-700' :
                            ul.status === 'pending_approval' ? 'bg-amber-400' : 'bg-emerald-500'
                          }`} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-950 dark:text-white text-sm">{ul.displayName || 'Usuario sin nombre'}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              ul.role === 'super_admin' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/10' :
                              ul.role === 'admin' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' :
                              'bg-blue-500/10 text-blue-500 border border-blue-500/10'
                            }`}>
                              {ul.role === 'super_admin' ? 'Super Admin' : ul.role === 'admin' ? 'Vendedor' : 'Comprador'}
                            </span>

                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
                              ul.status === 'blocked' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              ul.status === 'blocked_unpaid' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              ul.status === 'suspended' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                              ul.status === 'pending_approval' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}>
                              {ul.status === 'blocked' ? 'Bloqueado (Infracción)' : 
                               ul.status === 'blocked_unpaid' ? 'Falta de Pago 💸' : 
                               ul.status === 'suspended' ? 'Dado de Baja 🛑' : 
                               ul.status === 'pending_approval' ? 'Pendiente' : 
                               'Activo'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-450 space-y-0.5">
                            <p className="flex items-center gap-1">Correo: <strong className="text-slate-800 dark:text-slate-350 font-mono text-[11px]">{ul.email}</strong></p>
                            {ul.role === 'admin' && (
                              <>
                                <p className="flex items-center gap-1">
                                  <Store size={11} className="text-emerald-500 shrink-0" />
                                  <span>Negocio: <strong>{ul.businessName || 'Comercio CataloGo'}</strong> (/c/{ul.slug || 'comercio'})</span>
                                </p>
                                <p className="flex items-center gap-2">
                                  <span className="bg-indigo-505/10 text-indigo-550 border border-indigo-500/25 dark:bg-indigo-950 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    Plan {curPlanName}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px]">
                                    <ShoppingBag size={11} className="text-slate-400" />
                                    <strong>{userProds.length} / {curPlanLimit === 99999 ? 'Ilimitado' : curPlanLimit}</strong> productos cargados
                                  </span>
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Management Actions */}
                      <div className="flex gap-2 flex-wrap items-center justify-end w-full lg:w-auto mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800/80">
                        {!isNelson ? (
                          <div className="flex flex-col gap-1 w-full lg:w-auto">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block lg:text-right">Acciones de Estado</span>
                            <div className="flex flex-wrap gap-1">
                              {/* Re-Activate or Approve */}
                              {(ul.status !== 'active' && ul.status !== undefined) && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateUserStatus(ul.uid, 'active')}
                                  className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 rounded-lg transition"
                                  title="Habilitar o reactivar comercio"
                                >
                                  Habilitar
                                </button>
                              )}

                              {/* Block for Non-Payment */}
                              {ul.status !== 'blocked_unpaid' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateUserStatus(ul.uid, 'blocked_unpaid')}
                                  className="h-7 text-[10px] border border-amber-500/30 text-amber-550 hover:bg-amber-500/10 font-bold px-2 rounded-lg transition"
                                  title="Bloquear cuenta por morosidad en suscripción"
                                >
                                  Mora Pago
                                </button>
                              )}

                              {/* Terminate Account / De-register */}
                              {ul.status !== 'suspended' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateUserStatus(ul.uid, 'suspended')}
                                  className="h-7 text-[10px] border border-rose-500/30 text-rose-500 dark:text-rose-455 hover:bg-red-500/10 font-bold px-2 rounded-lg transition"
                                  title="Dar de baja temporal o permanente"
                                >
                                  Dar de Baja
                                </button>
                              )}

                              {/* Block Generally */}
                              {ul.status !== 'blocked' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateUserStatus(ul.uid, 'blocked')}
                                  className="h-7 text-[10px] text-red-500 hover:bg-red-500/5 font-medium px-2 rounded-lg transition"
                                  title="Suspender cuenta por infracción genérica"
                                >
                                  Bloqueo Gral
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest leading-none">
                            🛡️ Propietario Principal
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* Plan Form Modal */}
      {isPlanFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between">
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingPlan ? 'Configurar Límites del Plan' : 'Crear Ficha de Plan'}
                </h3>
                <p className="text-xs text-slate-500">Define los coeficientes y límites de comercialización SaaS.</p>
              </div>
              <button 
                onClick={() => setIsPlanFormOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer font-extrabold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
                  <X size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID del Plan *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    placeholder="ej: premium"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500 disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="ej: Plan Premium"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo Mensual (Gs.) *</label>
                  <input
                    type="number"
                    required
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="ej: 120000"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Límite Productos *</label>
                  <input
                    type="number"
                    required
                    value={planProductLimit}
                    onChange={(e) => setPlanProductLimit(e.target.value)}
                    placeholder="ej: 5 o 200 (99999 para ilimitados)"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descripción Breve</label>
                <input
                  type="text"
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="ej: Excelente para medianas empresas con alto volumen de ventas"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beneficios del Plan (Uno por línea)</label>
                <textarea
                  rows={4}
                  value={planFeatures}
                  onChange={(e) => setPlanFeatures(e.target.value)}
                  placeholder="ej:&#10;Productos ILIMITADOS&#10;Estadísticas premium&#10;Soporte prioritario"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setIsPlanFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 text-xs rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-650 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Non-blocking Toast Alerts to bypass iframe alert limiters */}
      {toast && (
        <div id="admin-toast-notification" className="fixed bottom-5 right-5 z-[100] max-w-sm bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in-up">
          <div className={`p-2 rounded-xl shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
            toast.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
          }`}>
            <ShieldCheck size={16} />
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">{toast.message}</p>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm ml-auto p-1 font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Custom Modal Confirmation Dialog to Bypass Iframe Blockers */}
      {confirmModal && confirmModal.isOpen && (
        <div id="custom-confirmation-modal" className="fixed inset-0 z-[99] flex items-center justify-center bg-slate-950/70 p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-500/10 shrink-0">
              <AlertTriangle className={`w-6 h-6 ${
                confirmModal.type === 'danger' ? 'text-red-500' :
                confirmModal.type === 'warning' ? 'text-amber-500' :
                confirmModal.type === 'success' ? 'text-emerald-500' : 'text-indigo-500'
              }`} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-extrabold text-slate-950 dark:text-white text-base leading-snug">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="h-10 border border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-xl cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await confirmModal.onConfirm();
                  } catch (e) {
                    console.error("Action approval error:", e);
                  }
                }}
                className={`h-10 text-white font-bold text-xs rounded-xl cursor-pointer transition ${
                  confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500' :
                  confirmModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                  confirmModal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-555' :
                  'bg-indigo-600 hover:bg-indigo-550'
                }`}
              >
                Confirmar Acción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
