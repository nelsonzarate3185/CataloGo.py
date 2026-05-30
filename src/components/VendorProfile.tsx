import React, { useState, useEffect } from 'react';
import { 
  Store, Phone, MapPin, Clipboard, FileText, Check, AlertCircle, Sparkles, Image, User, ShieldCheck, KeyRound, Lock, UserCog
} from 'lucide-react';
import { UserProfile } from '../types';
import { db, OperationType, handleFirestoreError, changePassword, doc, updateDoc } from '../supabase';
import { slugify, formatWhatsAppPhone } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface VendorProfileProps {
  currentUserId: string;
  vendorProfile: UserProfile | null;
  onProfileUpdated: () => void;
}

export default function VendorProfile({ currentUserId, vendorProfile, onProfileUpdated }: VendorProfileProps) {
  // Navigation Tabs inside profile manager
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // General profile state
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  // Sells / Merchant specific state
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('Asunción');
  const [address, setAddress] = useState('');
  const [ruc, setRuc] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Password Modification Tab state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Sync state values on load
  useEffect(() => {
    if (vendorProfile) {
      setDisplayName(vendorProfile.displayName || '');
      setPhotoURL(vendorProfile.photoURL || '');
      setBusinessName(vendorProfile.businessName || '');
      setSlug(vendorProfile.slug || '');
      setWhatsapp(vendorProfile.whatsapp || '');
      setCity(vendorProfile.city || 'Asunción');
      setAddress(vendorProfile.address || '');
      setRuc(vendorProfile.ruc || '');
      setLogoUrl(vendorProfile.logoUrl || '');
      setDescription(vendorProfile.description || '');
    }
  }, [vendorProfile]);

  // Handy auto-slugify help
  const handleNameChange = (val: string) => {
    setBusinessName(val);
    setSlug(slugify(val));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setStatusMessage({ type: 'error', text: 'El Nombre Completo es requerido.' });
      return;
    }

    const isBuyer = vendorProfile?.role === 'buyer';
    let validWhatsApp = '';

    if (!isBuyer) {
      if (!businessName.trim() || !whatsapp.trim()) {
        setStatusMessage({ type: 'error', text: 'Por favor completa los campos del comercio requeridos (*).' });
        return;
      }

      // Standard Paraguayan Mobile country format validation (595XXXXXXXXX)
      validWhatsApp = formatWhatsAppPhone(whatsapp);
      if (validWhatsApp.length < 11 || !validWhatsApp.startsWith('595')) {
        setStatusMessage({ 
          type: 'error', 
          text: 'Formato de WhatsApp incorrecto. Debe incluir el código de país (Ej: 595981234567).' 
        });
        return;
      }
    }

    setSaving(true);
    setStatusMessage(null);

    const updatedProfile: Partial<UserProfile> = {
      displayName: displayName.trim(),
      photoURL: photoURL.trim(),
      ...(!isBuyer ? {
        businessName: businessName.trim(),
        slug: slugify(slug || businessName),
        whatsapp: validWhatsApp,
        city,
        address: address.trim(),
        ruc: ruc.trim(),
        logoUrl: logoUrl.trim(),
        description: description.substring(0, 200).trim(),
      } : {})
    };

    const path = `users/${currentUserId}`;
    try {
      await updateDoc(doc(db, 'users', currentUserId), updatedProfile);
      setStatusMessage({ type: 'success', text: '¡Perfil de usuario actualizado correctamente!' });
      onProfileUpdated();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } catch (logErr: any) {
        setStatusMessage({ type: 'error', text: 'Error guardando datos de perfil: ' + logErr.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(newPassword);
      setPasswordMsg({ type: 'success', text: '¡Tu contraseña ha sido cambiada exitosamente!' });
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      console.error("Change password error:", error);
      let localizedError = 'Ocurrió un error al cambiar la contraseña.';
      if (error.code === 'auth/requires-recent-login') {
        localizedError = 'Por seguridad, esta acción requiere que hayas iniciado sesión recientemente. Vuelve a ingresar e intenta nuevamente.';
      } else if (error.message) {
        localizedError = error.message;
      }
      setPasswordMsg({ type: 'error', text: localizedError });
    } finally {
      setPasswordSaving(false);
    }
  };

  const paraguayCities = [
    'Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 
    'Lambaré', 'Fernando de la Mora', 'Limpio', 'Salto del Guairá', 
    'Encarnación', 'Mariano Roque Alonso', 'Pedro Juan Caballero', 
    'Caaguazú', 'Coronel Oviedo', 'Itauguá', 'Villa Elisa'
  ];

  const isSeller = vendorProfile?.role === 'admin' || vendorProfile?.role === 'super_admin';

  return (
    <div id="vendor-profile-root" className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog className="text-emerald-500" size={24} />
            <span>Gestión de Cuenta Unificada</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administra tus credenciales personales, perfil {isSeller ? 'de comercio' : 'de comprador'} y claves de acceso desde el mismo lugar.
          </p>
        </div>

        {/* Unified Tab toggles */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-450'
            }`}
          >
            <User size={13} />
            <span>Mis Datos</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-450'
            }`}
          >
            <KeyRound size={13} />
            <span>Seguridad (Clave)</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.form 
            key="profile-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSaveProfile} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-6"
          >
            {statusMessage && (
              <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/15 text-red-500'
              }`}>
                {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* General Fields Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Datos Generales</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={12} className="text-slate-400" />
                    <span>Nombre Completo *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Image size={12} className="text-slate-400" />
                    <span>Tu Foto / Avatar (URL)</span>
                  </label>
                  <input
                    type="text"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://images.unsplash.com/your-photo"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Vendor Specific Section */}
            {isSeller && (
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Información de Comercio (CataloGo)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Business name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Store size={12} className="text-slate-400" />
                      <span>Nombre comercial del Comercio *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ej: Calzados Nelson"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Slug input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clipboard size={12} className="text-slate-400" />
                      <span>Slug / URL de Acceso *</span>
                    </label>
                    <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-sm">
                      <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-850 text-slate-500 border-r border-slate-200 dark:border-slate-700 text-xs font-mono">
                        /c/
                      </span>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => setSlug(slugify(e.target.value))}
                        placeholder="calzados-nelson"
                        className="w-full bg-transparent border-0 px-3 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Teléfono WhatsApp format */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400" />
                      <span>WhatsApp para recibir Pedidos *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="595981123456"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-slate-905 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="block text-[10px] text-slate-450 font-semibold leading-relaxed">
                      Requerido: formato del país Paraguay, inicial 595 (Ej: 595981123456).
                    </span>
                  </div>

                  {/* RUC */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={12} className="text-slate-400" />
                      <span>RUC Comercial</span>
                    </label>
                    <input
                      type="text"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value)}
                      placeholder="Ej: 80012345-6"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ciudad */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400" />
                      <span>Ciudad *</span>
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {paraguayCities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dirección */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400" />
                      <span>Dirección del Local</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Calle Palma 123 c/ Colón"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-slate-905 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Logo URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Store size={12} className="text-slate-400" />
                    <span>Logo del Comercio (URL del Servidor de Fotos)</span>
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/your-logo"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span>Breve descripción del Comercio</span>
                    <span className="text-[10px] text-slate-400 font-semibold lowercase italic">({200 - description.length} caract.)</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe brevemente tu catálogo o tu local comercial..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={saving || !displayName.trim()}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 cursor-pointer text-white font-extrabold h-11 px-6 rounded-xl text-xs shadow-xs hover:shadow-md transition-all duration-150"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Hacer Efectivos mis Datos</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.form 
            key="security-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handlePasswordChange}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-6"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mb-1.5">
                <Lock size={15} className="text-emerald-500" />
                <span>Modificar clave de acceso</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cambia de forma segura tu contraseña local de CataloGo. Asegúrate de elegir una contraseña segura y fácil de recordar.
              </p>
            </div>

            {passwordMsg && (
              <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
                passwordMsg.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/15 text-red-500'
              }`}>
                {passwordMsg.type === 'success' ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={15} />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={15} />
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={passwordSaving || !newPassword || !confirmNewPassword}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 cursor-pointer text-white font-extrabold h-11 px-6 rounded-xl text-xs shadow-xs hover:shadow-md transition-all"
              >
                {passwordSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>Actualizar Contraseña</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
