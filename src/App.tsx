import React, { useEffect, useState } from 'react';
import { 
  auth, db, handleFirestoreError, signInWithGoogle, logout, OperationType,
  onAuthStateChanged, User, collection, onSnapshot, doc, setDoc, query, where, limit 
} from './supabase';
import { Product, Order, UserProfile, Category } from './types';
import ThemeToggle from './components/ThemeToggle';
import AuthView from './components/AuthView';
import AdminDashboard from './components/AdminDashboard';
import CatalogManager from './components/CatalogManager';
import CategoryManager from './components/CategoryManager';
import QRManager from './components/QRManager';
import SuscripcionManager from './components/SuscripcionManager';
import VendorProfile from './components/VendorProfile';
import MarketplaceView from './components/MarketplaceView';
import OrderTracker from './components/OrderTracker';
import SuperAdminPanel from './components/SuperAdminPanel';
import { 
  Store, LayoutGrid, ClipboardList, ShoppingCart, LogOut, 
  Sparkles, ToggleLeft, ToggleRight, UserIcon, ShieldCheck,
  Tag, QrCode, CreditCard, User as UserDesignIcon, FolderSync, ShoppingBag,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [vendorProfile, setVendorProfile] = useState<UserProfile | null>(null);
  const [viewingVendor, setViewingVendor] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real-time collections
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Routing and tracking states
  const [activeView, setActiveView] = useState('dashboard'); // Default view for seller
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(true); // Default to live console panel for easy testing
  const [selectedRole, setSelectedRole] = useState<'admin' | 'buyer'>('admin');
  const [isGuest, setIsGuest] = useState(false);
  const [bypassPendingView, setBypassPendingView] = useState(false);

  // 1. Authentication listener (leak-proof)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      // If we are currently simulating a guest purchase mode, bypass standard state override
      if (isGuest && !currentUser) return;
      setUser(currentUser);
      if (!currentUser) {
        setVendorProfile(null);
        setIsLoading(false);
      } else {
        setIsGuest(false);
      }
    });

    return () => unsub();
  }, [isGuest]);

  // 1.5 Real-time Profile listener & bootstrap
  useEffect(() => {
    if (!user || isGuest) {
      if (!user) {
        setIsLoading(false);
      }
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const profileData = snap.data() as UserProfile;
        setVendorProfile(profileData);
        
        // If the user logging in is explicitly a regular buyer, force consumer view
        if (profileData.role === 'buyer') {
          setIsAdminView(false);
          setActiveView('marketplace');
        } else if (profileData.role === 'super_admin' || user.email === "nelsonzarate3185@gmail.com") {
          setIsAdminView(true);
          setActiveView('superadmin');
        } else {
          setIsAdminView(true);
          setActiveView('dashboard');
        }
      } else {
        // Document creation for the brand new User
        const tempRegName = localStorage.getItem('temp_reg_display_name') || '';
        const tempRegBusinessName = localStorage.getItem('temp_reg_business_name') || '';
        const tempRegRole = localStorage.getItem('temp_reg_role') as 'admin' | 'buyer' | null;
        const currentSelectedRole = tempRegRole || selectedRole;
        const isNelson = user.email === "nelsonzarate3185@gmail.com";

        const initialProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: tempRegName || user.displayName || 'Comercio CataloGo',
          businessName: isNelson ? 'Catalogo Nelson Zárate' : (tempRegBusinessName || (currentSelectedRole === 'admin' ? 'Mi Comercio Digital' : 'Comprador Frecuente')),
          slug: isNelson ? 'catalogo-nelson' : 'comercio-' + Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5),
          whatsapp: '595981234567',
          city: 'Asunción',
          address: 'Palma 123 c/ Colón',
          ruc: '1234567-8',
          logoUrl: '',
          description: 'Aquí encontrarás calzados paraguayos y accesorios exclusivos de alta calidad con envíos rápidos contra entrega.',
          plan: 'free',
          photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80',
          role: isNelson ? 'super_admin' : currentSelectedRole,
          status: isNelson ? 'active' : (currentSelectedRole === 'admin' ? 'pending_approval' : 'active'),
          createdAt: new Date().toISOString()
        };

        // Clear temporary registration inputs to keep localStorage clean
        localStorage.removeItem('temp_reg_display_name');
        localStorage.removeItem('temp_reg_business_name');
        localStorage.removeItem('temp_reg_role');
        
        try {
          await setDoc(userRef, initialProfile);
          setVendorProfile(initialProfile);
          
          if (initialProfile.role === 'buyer') {
            setIsAdminView(false);
            setActiveView('marketplace');
          } else if (initialProfile.role === 'super_admin') {
            setIsAdminView(true);
            setActiveView('superadmin');
          } else {
            setIsAdminView(true);
            setActiveView('dashboard');
          }
        } catch (err) {
          console.warn("Auto-bootstrap doc save rules:", err);
          setVendorProfile(initialProfile);
        }
      }
      setIsLoading(false);
    }, (err) => {
      console.warn("Error subscribing to profile stream:", err);
      setIsLoading(false);
    });

    return () => unsubProfile();
  }, [user, isGuest, selectedRole]);

  // 1.8 Fetch dynamic viewing vendor catalog profile (from ?slug URL or fallback to own profile)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const slugParam = urlParams.get('slug');

    if (slugParam) {
      const q = query(collection(db, 'users'), where('slug', '==', slugParam));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const docData = snap.docs[0].data() as UserProfile;
          setViewingVendor(docData);
          // If a buyer is viewing via a specific slug, force buyer view and marketplace view
          setIsAdminView(false);
          setActiveView('marketplace');
        } else {
          console.warn(`No se encontró vendedor con el slug: ${slugParam}`);
        }
      }, (err) => {
        console.warn("Error fetching viewing vendor profile by slug:", err);
      });
      return () => unsub();
    } else {
      if (vendorProfile && vendorProfile.role !== 'buyer') {
        setViewingVendor(vendorProfile);
      } else {
        // Find first active vendor from database as fallback storefront when no slug is in URL
        // Highly optimized: Query only admin/super_admin roles and limit to 10 results to lower read counts
        const q = query(
          collection(db, 'users'),
          where('role', 'in', ['admin', 'super_admin']),
          limit(10)
        );
        const unsub = onSnapshot(q, (snap) => {
          const uList: UserProfile[] = [];
          snap.forEach(d => {
            uList.push(d.data() as UserProfile);
          });
          const adminVendor = uList.find(u => u.status === 'active') || uList[0];
          if (adminVendor) {
            setViewingVendor(adminVendor);
          }
        }, (err) => {
          console.warn("Fallback finding default active vendor failed:", err);
        });
        return () => unsub();
      }
    }
  }, [vendorProfile]);

  // 2. Fetch products in real-time
  useEffect(() => {
    if (!user) return;
    
    // Low-overhead Firestore queries tailored specifically for the user's role/view to protect privacy and prevent "Rate Exceeded"
    let q;
    if (vendorProfile?.role === 'super_admin' || user.email === "nelsonzarate3185@gmail.com") {
      q = collection(db, 'products');
    } else if (isAdminView) {
      q = query(collection(db, 'products'), where('ownerId', '==', user.uid));
    } else {
      q = query(collection(db, 'products'), where('ownerId', '==', viewingVendor?.uid || vendorProfile?.uid || 'no_vendor'));
    }

    const unsubProducts = onSnapshot(q, (snapshot) => {
      const prodList: Product[] = [];
      snapshot.forEach((doc) => {
        prodList.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(prodList);
    }, (err) => {
      console.warn("Fallback local products list offline simulation:");
      setProducts([
        {
          id: "prod_sample1",
          name: "Calzado Deportivo Urban Pro",
          description: "Tenis deportivos ergonómicos con suela antideslizante, ideales para caminatas diarias por el centro de Asunción.",
          price: 185000,
          stock: 15,
          category: "Calzado",
          imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80",
          viewsCount: 38,
          ownerId: user.uid,
          tags: ["Deportivo", "Asunción", "Confort"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "prod_sample2",
          name: "Mocasines de Cuero Genuino",
          description: "Calzados elegantes de cuero fino nacional elaborados de manera artesanal por zapateros locales.",
          price: 245000,
          stock: 8,
          category: "Calzado",
          imageUrl: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=500&auto=format&fit=crop&q=80",
          viewsCount: 74,
          ownerId: user.uid,
          tags: ["Cuero", "Artesanal", "Elegante"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    });

    return () => unsubProducts();
  }, [user, isAdminView, viewingVendor?.uid, vendorProfile?.uid, vendorProfile?.role]);

  // 3. Fetch Orders in real-time inside the seller console
  useEffect(() => {
    if (!user) return;
    
    // Queries restricted at DB query level to lower database load and ensure seller data isolation
    let q;
    if (vendorProfile?.role === 'super_admin' || user.email === "nelsonzarate3185@gmail.com") {
      q = collection(db, 'orders');
    } else if (vendorProfile?.role === 'buyer') {
      q = query(collection(db, 'orders'), where('buyerUid', '==', user.uid));
    } else {
      q = query(collection(db, 'orders'), where('vendorId', '==', user.uid));
    }

    const unsubOrders = onSnapshot(q, (snapshot) => {
      const orderList: Order[] = [];
      snapshot.forEach((doc) => {
        orderList.push({ id: doc.id, ...doc.data() } as Order);
      });
      orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(orderList);
    }, (err) => {
      console.warn("Standard orders fallbacked");
    });

    return () => unsubOrders();
  }, [user, vendorProfile?.role]);

  // 4. Fetch private categories in real-time
  useEffect(() => {
    if (!user) return;
    
    // Database-level query isolation for categories list to minimize reads and prevent limits exceeding
    let q;
    if (vendorProfile?.role === 'super_admin' || user.email === "nelsonzarate3185@gmail.com") {
      q = collection(db, 'categories');
    } else if (isAdminView) {
      q = query(collection(db, 'categories'), where('vendorId', '==', user.uid));
    } else {
      q = query(collection(db, 'categories'), where('vendorId', '==', viewingVendor?.uid || vendorProfile?.uid || 'no_vendor'));
    }

    const unsubCategories = onSnapshot(q, (snapshot) => {
      const catList: Category[] = [];
      snapshot.forEach((doc) => {
        catList.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategoriesList(catList);
    }, (err) => {
      setCategoriesList([
        { id: "cat_1", name: "Calzado", vendorId: user.uid, sortOrder: 1 },
        { id: "cat_2", name: "Ropa", vendorId: user.uid, sortOrder: 2 },
        { id: "cat_3", name: "Accesorios", vendorId: user.uid, sortOrder: 3 }
      ]);
    });

    return () => unsubCategories();
  }, [user, isAdminView, viewingVendor?.uid, vendorProfile?.uid, vendorProfile?.role]);

  // Login handlers passed to AuthView
  const handleAuthSuccess = (googleUser: any, role: 'admin' | 'buyer') => {
    setSelectedRole(role);
    setUser(googleUser);
  };

  const handleEnterAsGuest = () => {
    setIsGuest(true);
    // Construct animated/safe simulated guest buyer object to preserve system structures cleanly
    const simulatedGuest = {
      uid: 'guest_shopper_' + Math.random().toString(36).substring(2, 9),
      displayName: 'Comprador Invitado',
      email: 'invitado@catalogogo.com.py',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80',
    };
    
    const simulatedProfile: UserProfile = {
      uid: simulatedGuest.uid,
      email: simulatedGuest.email,
      displayName: simulatedGuest.displayName,
      photoURL: simulatedGuest.photoURL,
      role: 'buyer',
      plan: 'free',
      createdAt: new Date().toISOString()
    };

    setVendorProfile(simulatedProfile);
    setUser(simulatedGuest as any);
    setIsAdminView(false);
    setActiveView('marketplace');
  };

  const handleLogOut = async () => {
    if (isGuest) {
      setIsGuest(false);
      setUser(null);
      setVendorProfile(null);
    } else {
      await logout();
    }
  };

  // Loading Screen spinner layout
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-mono text-xs animate-pulse">Sincronizando CataloGo...</p>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return (
      <AuthView 
        onAuthSuccess={handleAuthSuccess} 
        onEnterAsGuest={handleEnterAsGuest}
        isLoading={isLoading} 
      />
    );
  }

  // Guard: User is blocked, suspended, or unpaid
  const isUserBlocked = user && (
    vendorProfile?.status === 'blocked' || 
    vendorProfile?.status === 'blocked_unpaid' || 
    vendorProfile?.status === 'suspended'
  );

  if (isUserBlocked) {
    const isUnpaid = vendorProfile?.status === 'blocked_unpaid';
    const isSuspended = vendorProfile?.status === 'suspended';
    
    return (
      <div id="blocked-screen" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl space-y-6">
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${
            isUnpaid ? 'bg-amber-500/10' : 'bg-red-500/10'
          }`}>
            <ShieldAlert className={`w-8 h-8 ${isUnpaid ? 'text-amber-500 animate-pulse' : 'text-red-500 animate-bounce'}`} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {isUnpaid ? 'Suscripción Suspendida' : isSuspended ? 'Cuenta de Baja' : 'Acceso Restringido'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
              {isUnpaid ? (
                <span>Tu comercio digital y catálogo de ventas <strong>"{vendorProfile?.businessName}"</strong> han sido suspendidos temporalmente por falta de pago de tu suscripción contratada en CataloGo.py. Regulariza tu saldo para restaurar el servicio de inmediato.</span>
              ) : isSuspended ? (
                <span>Esta cuenta ha sido dada de baja del ecosistema de CataloGo. Si crees que se trata de un error o deseas reactivar tu comercio local, ponte en contacto con nuestra administración.</span>
              ) : (
                <span>Tu cuenta de usuario ha sido bloqueada temporalmente por el equipo de administración de CataloGo debido a irregularidades detectadas o incumplimiento normativo.</span>
              )}
            </p>
          </div>
          <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
            isUnpaid 
              ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/15 text-amber-600 dark:text-amber-450'
              : 'bg-red-500/5 dark:bg-red-500/10 border-red-500/15 text-red-650 dark:text-red-400'
          }`}>
            {isUnpaid ? (
              <span>Envía tu comprobante de pago o transferencia de suscripción PY a <strong className="select-all">pagos@catalogogo.com.py</strong> para habilitar tus links de WhatsApp y QR.</span>
            ) : (
              <span>Para solicitar la reactivación o resolver dudas comerciales de su negocio, comuníquate con soporte a <strong className="select-all block mt-0.5 text-slate-900 dark:text-slate-100">soporte@catalogogo.com.py</strong></span>
            )}
          </div>
          <button
            onClick={handleLogOut}
            className="w-full h-11 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Cerrar Sesión / Cambiar de Cuenta
          </button>
        </div>
      </div>
    );
  }

  // Guard: Seller pending approval (Only blocks the admin dashboard/seller fields)
  if (user && vendorProfile?.role === 'admin' && vendorProfile?.status === 'pending_approval' && isAdminView) {
    return (
      <div id="pending-approval-screen" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Store className="text-amber-500 w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Cuenta en Revisión</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
              Registrado exitosamente. Para garantizar la seguridad del SaaS y del ecosistema CataloGo, un Super Administrador debe aprobar tu alta de Vendedor para habilitar tu consola.
            </p>
          </div>
          <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/15 text-xs text-amber-600 dark:text-amber-450">
            Tu catálogo inteligente, paneles de precios, códigos QR y sincronización WhatsApp estarán habilitados enseguida.
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                setIsAdminView(false);
                setActiveView('marketplace');
              }}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingBag size={14} />
              <span>Explorar Catálogo como Comprador</span>
            </button>
            <button
              onClick={handleLogOut}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cerrar Sesión / Cambiar Cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleProfileUpdated = () => {
    // Fresh listener trigger
  };

  const handleUpdatePlan = async () => {
    // Dynamic plan updates are handled safely via dynamic requests and Super Admin panel
  };

  const isPlatformOwner = user?.email === "nelsonzarate3185@gmail.com" || vendorProfile?.role === "super_admin";
  const isRegularBuyer = vendorProfile?.role === 'buyer';

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
              <Store className="text-emerald-500 w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                Catalo<span className="text-emerald-500 font-black">Go</span>
              </h1>
              <span className="text-[10px] font-mono font-bold text-slate-400">Plataforma SaaS Paraguay</span>
            </div>
          </div>

          {/* User status and toggles */}
          <div className="flex items-center gap-2 sm:gap-4 font-sans">
            
            {/* Live simulation bypass button (only visible to sellers and platform owners) */}
            {!isRegularBuyer && (
              <button
                onClick={() => {
                  setIsAdminView(prev => !prev);
                  setActiveView(!isAdminView ? 'dashboard' : 'marketplace');
                }}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-1.5 px-3 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-750 transition cursor-pointer"
                title="Alternar entre rol Vendedor y rol Comprador para probar flujos"
              >
                <span>{isAdminView ? "Ir a vista Comprador" : "Ir a Consola Comercio"}</span>
                {isAdminView ? (
                  <ToggleRight className="text-emerald-500" size={18} />
                ) : (
                  <ToggleLeft className="text-slate-405" size={18} />
                )}
              </button>
            )}

            <ThemeToggle />

            {/* Profile badge & Sign out */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <img 
                src={user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop"} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800 shrink-0"
              />
              <div className="hidden lg:block text-left text-xs leading-tight">
                <p className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{user.displayName || 'Vendedor'}</p>
                <p className="text-[9px] text-emerald-555 font-mono tracking-wider uppercase font-extrabold flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isGuest ? 'Invitado' : (isPlatformOwner ? 'Super Admin' : `Plan: ${vendorProfile?.plan?.toUpperCase() || 'FREE'}`)}</span>
                </p>
              </div>
              <button 
                onClick={handleLogOut}
                className="p-1.5 rounded-full hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Navigation Sidebar Drawer */}
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl space-y-3 font-sans shadow-sm">
            
            <div className="p-3 rounded-xl bg-linear-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/10 text-center space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block">Modo Activo</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                {isAdminView ? "Consola Vendedor" : "Catálogo Público"}
              </span>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Vistas Disponibles</p>
            
            <nav className="space-y-1">
              {isAdminView ? (
                // Seller Console views
                <>
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activeView === 'dashboard' 
                        ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    <LayoutGrid size={15} />
                    <span>Métricas Dashboard</span>
                  </button>

                  <button
                    onClick={() => setActiveView('catalog')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activeView === 'catalog' 
                        ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    <ShoppingBag size={15} />
                    <span>Gestionar Productos</span>
                  </button>

                  <button
                    onClick={() => setActiveView('categories')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activeView === 'categories' 
                        ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    <FolderSync size={15} />
                    <span>Categorías del Catálogo</span>
                  </button>

                  <button
                    onClick={() => setActiveView('qr')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activeView === 'qr' 
                        ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    <QrCode size={15} />
                    <span>Códigos QR & Link</span>
                  </button>

                  <button
                    onClick={() => setActiveView('tracker')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activeView === 'tracker' 
                        ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    <ClipboardList size={15} />
                    <span>Gestionar Pedidos</span>
                  </button>

                  <button
                    onClick={() => setActiveView('suscripcion')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activeView === 'suscripcion' 
                        ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    <CreditCard size={15} />
                    <span>Plan Suscripción</span>
                  </button>

                  <button
                    onClick={() => setActiveView('profile')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activeView === 'profile' 
                        ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    <UserDesignIcon size={15} />
                    <span>Perfil del Comercio</span>
                  </button>

                  {isPlatformOwner && (
                    <button
                      onClick={() => setActiveView('superadmin')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition border border-rose-500/20 ${
                        activeView === 'superadmin' 
                          ? 'bg-rose-600 text-white' 
                          : 'text-rose-500 hover:bg-rose-500/10'
                      }`}
                    >
                      <ShieldCheck size={15} />
                      <span>Consola Super Admin</span>
                    </button>
                  )}
                </>
              ) : (
                // Buyer / Marketplace public catalog views
                <>
                  <button
                    onClick={() => setActiveView('marketplace')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activeView === 'marketplace' 
                        ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    <Store size={15} />
                    <span>Productos del Local</span>
                  </button>

                  <button
                    onClick={() => setActiveView('tracker')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activeView === 'tracker' 
                        ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    <ClipboardList size={15} />
                    <span>Rastrear mi Pedido</span>
                  </button>

                  {isPlatformOwner && (
                    <button
                      onClick={() => {
                        setIsAdminView(true);
                        setActiveView('superadmin');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/15 cursor-pointer transition"
                    >
                      <ShieldCheck size={15} />
                      <span>Volver a Super Admin</span>
                    </button>
                  )}
                </>
              )}
            </nav>
          </div>
        </aside>
 
        {/* Dynamic Route View Content Area */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.12 }}
            >
              {activeView === 'dashboard' && isAdminView && (
                <AdminDashboard 
                  products={products.filter(p => p.ownerId === user?.uid)} 
                  orders={orders} 
                  onSetView={(v) => setActiveView(v)} 
                />
              )}

              {activeView === 'catalog' && isAdminView && (
                <CatalogManager 
                  products={products.filter(p => p.ownerId === user?.uid)} 
                  currentUserId={user.uid} 
                  categoriesList={categoriesList.filter(c => c.vendorId === user?.uid)}
                  currentPlan={vendorProfile?.plan || 'free'}
                />
              )}

              {activeView === 'categories' && isAdminView && (
                <CategoryManager currentUserId={user.uid} />
              )}

              {activeView === 'qr' && isAdminView && (
                <QRManager 
                  businessName={vendorProfile?.businessName || 'Mi Comercio'} 
                  slug={vendorProfile?.slug || 'vendedor'} 
                />
              )}

              {activeView === 'suscripcion' && isAdminView && (
                <SuscripcionManager 
                  currentPlan={vendorProfile?.plan || 'free'} 
                  productsCount={products.filter(p => p.ownerId === user?.uid).length}
                  userId={user.uid}
                  vendorProfile={vendorProfile}
                />
              )}

              {activeView === 'profile' && isAdminView && (
                <VendorProfile 
                  currentUserId={user.uid} 
                  vendorProfile={vendorProfile} 
                  onProfileUpdated={handleProfileUpdated}
                />
              )}

              {activeView === 'superadmin' && isPlatformOwner && (
                <SuperAdminPanel currentUserId={user.uid} />
              )}

              {activeView === 'marketplace' && (
                <MarketplaceView 
                  products={products.filter(p => p.ownerId === (viewingVendor?.uid || vendorProfile?.uid))} 
                  vendorProfile={viewingVendor || vendorProfile} 
                  onSetView={(v) => setActiveView(v)}
                  onSetActiveOrderId={(id) => setActiveOrderId(id)}
                />
              )}

              {activeView === 'tracker' && (
                <OrderTracker 
                  currentUser={user} 
                  isAdminMode={isAdminView}
                  activeOrderId={activeOrderId}
                  onSetActiveOrderId={(id) => setActiveOrderId(id)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer information */}
      <footer className="mt-auto border-t border-slate-205 dark:border-slate-800 py-6 text-center text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-950/85">
        <p>&copy; {new Date().getFullYear()} CataloGo B2B Paraguay • Envío Instantáneo vía WhatsApp • Sincronización Serverless</p>
      </footer>
    </div>
  );
}
