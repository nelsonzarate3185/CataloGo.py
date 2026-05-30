import React, { useState } from 'react';
import { 
  LogIn, Sparkles, Store, ShoppingBag, ShieldAlert, User, ShieldCheck, HelpCircle, Mail, Lock, Phone, MapPin, KeyRound, ArrowLeft, Send
} from 'lucide-react';
import { signInWithGoogle, signUpEmail, signInEmail, resetPassword } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';

interface AuthViewProps {
  onAuthSuccess: (user: any, chosenRole: 'admin' | 'buyer') => void;
  onEnterAsGuest: () => void;
  isLoading: boolean;
}

type AuthTab = 'login' | 'register' | 'forgot';

export default function AuthView({ onAuthSuccess, onEnterAsGuest, isLoading }: AuthViewProps) {
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [chosenRole, setChosenRole] = useState<'admin' | 'buyer'>('admin');
  const [authTab, setAuthTab] = useState<AuthTab>('login');

  // Local Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const result = await signInWithGoogle();
      if (result.user) {
        onAuthSuccess(result.user, chosenRole);
      }
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      setErrorMsg(
        error.message?.includes('popup-blocked')
          ? 'El navegador bloqueó la popup de Google. Por favor, concede permisos para ventanas emergentes.'
          : 'Error de entrada con Google. Inténtalo de nuevo.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email) {
      setErrorMsg('Por favor ingresa tu correo electrónico.');
      return;
    }

    if (authTab === 'forgot') {
      setSigningIn(true);
      try {
        await resetPassword(email);
        setSuccessMsg('¡Enlace enviado! Hemos enviado un correo seguro para restablecer tu contraseña. Revisa tu buzón de entrada o spam.');
        setAuthTab('login');
      } catch (error: any) {
        console.error("Reset password error:", error);
        setErrorMsg(translateFirebaseError(error.code || error.message));
      } finally {
        setSigningIn(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Por favor ingresa tu contraseña.');
      return;
    }

    if (authTab === 'register') {
      if (password.length < 6) {
        setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.');
        return;
      }
      if (!displayName) {
        setErrorMsg('El Nombre Completo es requerido.');
        return;
      }
      if (chosenRole === 'admin' && !businessName) {
        setErrorMsg('El Nombre del Comercio es requerido.');
        return;
      }

      setSigningIn(true);
      try {
        // Save temporary registry information for App.tsx profile bootstrapping
        localStorage.setItem('temp_reg_display_name', displayName);
        localStorage.setItem('temp_reg_business_name', chosenRole === 'admin' ? businessName : 'Comprador Frecuente');
        localStorage.setItem('temp_reg_role', chosenRole);

        const result = await signUpEmail(email, password);
        if (result.user) {
          setSuccessMsg('Cuenta creada de manera exitosa.');
          onAuthSuccess(result.user, chosenRole);
        }
      } catch (error: any) {
        console.error("Register error:", error);
        setErrorMsg(translateFirebaseError(error.code || error.message));
      } finally {
        setSigningIn(false);
      }
    } else {
      // Local Login mode
      setSigningIn(true);
      try {
        // Match the role chosen in current selector in case profile bootstrapping triggers
        localStorage.setItem('temp_reg_role', chosenRole);
        const result = await signInEmail(email, password);
        if (result.user) {
          onAuthSuccess(result.user, chosenRole);
        }
      } catch (error: any) {
        console.error("Login error:", error);
        setErrorMsg(translateFirebaseError(error.code || error.message));
      } finally {
        setSigningIn(false);
      }
    }
  };

  const translateFirebaseError = (code: string): string => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este correo electrónico ya está registrado.';
      case 'auth/invalid-email':
        return 'El formato de correo electrónico no es válido.';
      case 'auth/weak-password':
        return 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta. Por favor intente de nuevo.';
      case 'auth/user-not-found':
        return 'No se encontró ninguna cuenta con este correo electrónico.';
      case 'auth/invalid-credential':
        return 'Credenciales inválidas. Verifica tu correo y contraseña.';
      case 'auth/network-request-failed':
        return 'Error de red. Verifica tu conexión de internet.';
      default:
        return `Ocurrió un error en la autenticación: ${code}`;
    }
  };

  return (
    <div id="auth-container" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative font-sans transition-colors duration-200">
      <div className="absolute inset-0 bg-linear-to-b from-emerald-500/5 to-transparent dark:from-emerald-500/10 dark:to-transparent pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden relative z-10 p-1"
      >
        {/* Brand Banner */}
        <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 rounded-t-2xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mb-4">
            <Store className="text-emerald-500 w-8 h-8 animate-pulse" />
          </div>
          <h1 id="brand-title" className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-2">
            Catalo<span className="text-emerald-500">Go</span>
          </h1>
          <p id="brand-tagline" className="text-slate-500 dark:text-slate-400 text-xs">
            La plataforma SaaS líder de Paraguay para catálogos inteligentes, sincronización en WhatsApp y automatización con IA.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Messages Alerts */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs animate-fadeIn">
              <ShieldAlert size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-xs animate-fadeIn">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab Selector Form */}
          {authTab !== 'forgot' && (
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Selecciona tu rol de acceso</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChosenRole('admin')}
                  className={`p-4 rounded-2xl border transition text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    chosenRole === 'admin' 
                      ? 'border-emerald-500 bg-emerald-500/[0.03] text-emerald-600 dark:text-emerald-400 font-extrabold ring-1 ring-emerald-500/25'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 hover:bg-slate-50 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Store size={20} className={chosenRole === 'admin' ? "text-emerald-500" : "text-slate-400"} />
                  <span className="text-xs font-bold">Soy Vendedor</span>
                  <span className="text-[9px] opacity-75 line-clamp-1">Administrar catálogo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChosenRole('buyer')}
                  className={`p-4 rounded-2xl border transition text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    chosenRole === 'buyer' 
                      ? 'border-emerald-500 bg-emerald-500/[0.03] text-emerald-600 dark:text-emerald-400 font-extrabold ring-1 ring-emerald-500/25'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 hover:bg-slate-50 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <ShoppingBag size={20} className={chosenRole === 'buyer' ? "text-emerald-500" : "text-slate-400"} />
                  <span className="text-xs font-bold">Soy Comprador</span>
                  <span className="text-[9px] opacity-75 line-clamp-1">Guardar mis compras</span>
                </button>
              </div>

              {chosenRole === 'admin' && authTab === 'register' && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-300">
                  ⚠️ <strong>Aprobación requerida:</strong> Como vendedor, tu cuenta pasará a revisión del superadministrador antes de poder publicar catálogos.
                </div>
              )}
            </div>
          )}

          {/* Local Forms section */}
          <form onSubmit={handleLocalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-400" size={15} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            {authTab !== 'forgot' && (
              <>
                {authTab === 'register' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Nombre Completo</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 text-slate-400" size={15} />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Juan Pérez"
                          className="w-full bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 dark:text-white"
                          required={authTab === 'register'}
                        />
                      </div>
                    </div>

                    {chosenRole === 'admin' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Nombre del Comercio / Empresa</label>
                        <div className="relative">
                          <Store className="absolute left-3 top-3.5 text-slate-400" size={15} />
                          <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Zapatería Palma S.A."
                            className="w-full bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 dark:text-white"
                            required={authTab === 'register' && chosenRole === 'admin'}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Contraseña</label>
                    {authTab === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('forgot');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-[10px] text-emerald-500 font-extrabold hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={15} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 dark:text-white"
                      required={authTab !== 'forgot'}
                    />
                  </div>
                </div>

                {authTab === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Confirmar Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 text-slate-400" size={15} />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                        className="w-full bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 dark:text-white"
                        required={authTab === 'register'}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Local Form Action Submit */}
            <button
              type="submit"
              disabled={signingIn}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {signingIn ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : authTab === 'forgot' ? (
                <>
                  <Send size={14} />
                  <span>Solicitar Código / Recuperar Acceso</span>
                </>
              ) : authTab === 'register' ? (
                <>
                  <KeyRound size={14} />
                  <span>Crear Cuenta de Acceso</span>
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  <span>Ingresar a mi Cuenta</span>
                </>
              )}
            </button>
          </form>

          {/* Form switch trigger details */}
          <div className="text-center">
            {authTab === 'login' ? (
              <p className="text-xs text-slate-500">
                ¿No tienes una cuenta aún?{' '}
                <button
                  onClick={() => {
                    setAuthTab('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-emerald-500 font-extrabold hover:underline"
                >
                  Regístrate gratis
                </button>
              </p>
            ) : (
              <button
                onClick={() => {
                  setAuthTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs text-slate-500 hover:text-slate-700 font-bold flex items-center justify-center gap-1 mx-auto hover:underline"
              >
                <ArrowLeft size={13} />
                <span>Volver al Inicio de Sesión</span>
              </button>
            )}
          </div>

          {/* Social login option */}
          {authTab !== 'forgot' && (
            <>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100 dark:border-slate-800/85"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[9px] uppercase font-mono tracking-widest font-extrabold">O CONECTA VÍA</span>
                <div className="flex-grow border-t border-slate-100 dark:border-slate-800/85"></div>
              </div>

              <div className="space-y-3">
                <button
                  id="google-signin-btn"
                  onClick={handleGoogleLogin}
                  disabled={signingIn || isLoading}
                  className="w-full h-11 flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl transition cursor-pointer font-bold text-xs shadow-sm border border-transparent dark:border-slate-700/60"
                >
                  {signingIn ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Ingresar con Google</span>
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800/85"></div>
                  <span className="flex-shrink mx-4 text-slate-400 text-[9px] uppercase font-mono tracking-widest font-extrabold">INVITADO</span>
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800/85"></div>
                </div>

                <button
                  type="button"
                  onClick={onEnterAsGuest}
                  className="w-full h-11 flex items-center justify-center gap-2 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <User size={14} />
                  <span>Explorar Catálogo como Comprador Invitado</span>
                </button>
              </div>
            </>
          )}

          <div className="flex justify-center items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <Sparkles size={13} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-405 dark:text-slate-550">
              Despliegue Serverless en Google Cloud Platform
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
