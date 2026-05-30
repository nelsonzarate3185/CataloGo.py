import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Sparkles, Image, Check, AlertCircle, 
  HelpCircle, Archive, ShoppingCart, Tag, ShieldCheck, Box, X, Upload
} from 'lucide-react';
import { Product, Category } from '../types';
import { formatGS } from '../utils';
import { db, OperationType, handleFirestoreError, doc, setDoc, updateDoc, deleteDoc, collection, onSnapshot } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { uploadToCloudinary } from '../utils/cloudinary';

interface CatalogManagerProps {
  products: Product[];
  currentUserId: string;
  categoriesList: Category[];
  currentPlan?: string;
}

export default function CatalogManager({ products, currentUserId, categoriesList, currentPlan = 'free' }: CatalogManagerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  
  // Custom or standard category lists
  const availableCategories = categoriesList.length > 0 
    ? categoriesList.map(c => c.name) 
    : ['Calzado', 'Ropa', 'Accesorios', 'Electrónica', 'Hogar', 'Salud y Belleza'];
    
  const categories = ['all', ...availableCategories];
  const [formCategory, setFormCategory] = useState(availableCategories[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImageUrls, setFormImageUrls] = useState<string[]>([]);
  const [compressingImages, setCompressingImages] = useState(false);
  const [formTags, setFormTags] = useState<string[]>([]);
  
  const [dbSaving, setDbSaving] = useState(false);
  const [errorStatus, setErrorStatus] = useState('');

  // 0. Dynamic Plan limits synchronization from db plans config
  const [planLimits, setPlanLimits] = useState<Record<string, number>>({
    'free': 5,
    'premium': 200,
    'pro': 200,
    'business': 99999,
    'unlimited': 99999
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'plans'), (snap) => {
      const limits: Record<string, number> = {
        'free': 5,
        'premium': 200,
        'pro': 200,
        'business': 99999,
        'unlimited': 99999
      };
      snap.forEach(doc => {
        const data = doc.data();
        if (data.id && data.productLimit !== undefined) {
          limits[data.id] = data.productLimit;
        }
      });
      setPlanLimits(limits);
    }, (err) => {
      console.warn("Failed fetching plan limits real-time, using static guidelines", err);
    });
    return () => unsub();
  }, []);

  const handleOpenCreateForm = () => {
    const limit = planLimits[currentPlan] !== undefined ? planLimits[currentPlan] : 5;
    if (products.length >= limit) {
      alert(`Has alcanzado el límite de productos de tu plan (${limit}). Por favor, solicita un upgrade de plan para publicar más.`);
      return;
    }

    setEditingProduct(null);
    setFormName('');
    setFormPrice('');
    setFormStock('');
    setFormCategory(availableCategories[0]);
    setFormDescription('');
    setFormImageUrl('');
    setFormImageUrls([]);
    setFormTags([]);
    setErrorStatus('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormPrice(product.price.toString());
    setFormStock(product.stock.toString());
    setFormCategory(product.category);
    setFormDescription(product.description || '');
    setFormImageUrl(product.imageUrl || '');
    setFormImageUrls(product.imageUrls || (product.imageUrl ? [product.imageUrl] : []));
    setFormTags(product.tags || []);
    setErrorStatus('');
    setIsFormOpen(true);
  };

  // Image Upload handler helper
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formImageUrls.length >= 3) {
      setErrorStatus('Solo puedes subir un máximo de 3 imágenes por producto.');
      return;
    }

    setCompressingImages(true);
    setErrorStatus('');

    try {
      const filesToProcess = Array.from(files).slice(0, 3 - formImageUrls.length);

      for (const file of filesToProcess) {
        const urlResult = await uploadToCloudinary(file as File);
        setFormImageUrls(prev => {
          const next = [...prev, urlResult];
          if (!formImageUrl) setFormImageUrl(next[0]);
          return next;
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus("Error subiendo o comprimiendo la imagen: " + (err.message || err));
    } finally {
      setCompressingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormImageUrls(prev => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length > 0) {
        setFormImageUrl(next[0]);
      } else {
        setFormImageUrl('');
      }
      return next;
    });
  };

  // 3. Save Product to Firestore
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice || !formStock) {
      setErrorStatus('Por favor completa los campos principales (*).');
      return;
    }

    // Limit security guard for both creation and updates
    const limit = planLimits[currentPlan] !== undefined ? planLimits[currentPlan] : 5;
    if (!editingProduct) {
      if (products.length >= limit) {
        setErrorStatus(`No se puede guardar: Límite de plan seleccionado (${limit}) excedido. Tienes ${products.length} productos registrados. Por favor solicita un cambio de plan.`);
        return;
      }
    } else {
      if (products.length > limit) {
        setErrorStatus(`No se puede actualizar: Límite de plan seleccionado (${limit}) excedido. Tienes ${products.length} productos registrados (Límite: ${limit}). Por favor solicita un cambio de plan o elimina artículos.`);
        return;
      }
    }

    setDbSaving(true);
    setErrorStatus('');
    const id = editingProduct ? editingProduct.id : 'prod_' + Math.random().toString(36).substring(2, 11);
    
    const finalImageUrls = formImageUrls.length > 0 ? formImageUrls.slice(0, 3) : (formImageUrl ? [formImageUrl] : []);
    const primaryImage = finalImageUrls[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80';

    const newProduct: Product = {
      id,
      name: formName,
      price: parseFloat(formPrice) || 0,
      stock: parseInt(formStock) || 0,
      category: formCategory,
      description: formDescription,
      imageUrl: primaryImage,
      imageUrls: finalImageUrls,
      viewsCount: editingProduct ? editingProduct.viewsCount : 0,
      ownerId: currentUserId,
      tags: formTags.length ? formTags : ['Nuevo'],
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const path = `products/${id}`;
    try {
      if (editingProduct) {
        // Update document
        await updateDoc(doc(db, 'products', id), { ...newProduct });
      } else {
        // Create document
        await setDoc(doc(db, 'products', id), newProduct);
      }
      setIsFormOpen(false);
    } catch (err) {
      // Custom security-rule logger boundary
      handleFirestoreError(err, editingProduct ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setDbSaving(false);
    }
  };

  // 4. Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar de catálogo este producto?')) return;
    const path = `products/${id}`;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Filter local catalog based on query and selection
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.category.toLowerCase().includes(search.toLowerCase()) ||
                          p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="catalog-manager-root" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Catálogo de Productos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Publica, edita stocks y optimiza fichas técnicas con Inteligencia Artificial.</p>
        </div>
        <button
          id="btn-add-product"
          onClick={handleOpenCreateForm}
          className="flex items-center gap-2 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition shadow-md cursor-pointer"
        >
          <Plus size={16} />
          <span>Agregar Producto</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            id="catalog-search-input"
            type="text"
            placeholder="Buscar por nombre, etiquetas, categoría..."
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

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filteredProducts.map((p) => (
            <motion.div
              layout
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col"
            >
              <div className="h-44 bg-slate-100 dark:bg-slate-800 relative group overflow-hidden">
                <img 
                  src={p.imageUrl} 
                  alt={p.name} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
                <div className="absolute top-2 right-2 bg-slate-950/80 px-2.5 py-1 rounded-md text-[11px] font-bold text-white tracking-wide uppercase">
                  {p.category}
                </div>
                {p.stock === 0 && (
                  <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-xs font-bold text-red-400 uppercase tracking-widest">
                    Agotado
                  </div>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{p.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {p.description ? p.description.replace(/[#*`-]/g, '') : 'Sin descripción.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {p.tags?.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">Precio</span>
                    <span className="font-bold text-slate-900 dark:text-white text-base">{formatGS(p.price)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">Disponibles</span>
                    <span className={`font-semibold ${p.stock <= 5 ? 'text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {p.stock} unidades
                    </span>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleOpenEditForm(p)}
                    className="flex-1 h-9 flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs rounded-lg transition font-medium cursor-pointer"
                  >
                    <Edit2 size={12} />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="p-2 border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                    title="Eliminar de catálogo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">
            <Box className="mx-auto text-slate-400 mb-3" size={40} />
            No se encontraron productos en el catálogo actual. ¡Agrega uno nuevo!
          </div>
        )}
      </div>

      {/* Slide-over / Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 p-4">
          <motion.div 
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl h-full shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Form Header */}
            <div className="p-6 border-b border-rose-100/10 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  {editingProduct ? 'Editar Ficha de Producto' : 'Crear Ficha de Producto'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Complementa la información de forma estándar o automatizada con IA.</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>

            {/* Form Body - Scrollable */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorStatus && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errorStatus}</span>
                </div>
              )}

              {/* Core fields */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Tenis Deportivos Ultra 2026"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Ej: 1500"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="Ej: 45"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white capitalize"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción (Soporta Markdown)</label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detalles del producto..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white"
                />
              </div>

              {/* Tags generated */}
              {formTags.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Etiquetas Sugeridas</label>
                  <div className="flex flex-wrap gap-1.5">
                    {formTags.map((t, idx) => (
                      <span key={idx} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-emerald-500/10">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Image control */}
              <div id="product-images-section" className="space-y-3 border-t border-slate-100 dark:border-slate-850 pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Imágenes del Producto (Hasta 3)</label>
                    <p className="text-[10px] text-slate-400">Comprimidas automáticamente para optimización móvil.</p>
                  </div>
                </div>

                {/* Grid of uploaded images with remove handler */}
                {formImageUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {formImageUrls.map((url, index) => (
                      <div key={index} className="aspect-square rounded-xl border border-slate-200 dark:border-slate-850 overflow-hidden bg-slate-50 dark:bg-slate-805 relative group">
                        <img 
                          src={url} 
                          alt={`Upload Preview ${index + 1}`} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-505 text-white rounded-full transition shadow-md cursor-pointer"
                          title="Eliminar imagen"
                        >
                          <X size={12} />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-slate-900/70 text-[9px] text-white px-1.5 py-0.5 rounded">
                          {index === 0 ? 'Principal' : `Foto ${index + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload drag-n-click card area */}
                {formImageUrls.length < 3 && (
                  <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition text-center">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={compressingImages}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      {compressingImages ? (
                        <>
                          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-1" />
                          <span className="text-xs font-semibold text-emerald-500">Optimizando y publicando imagen...</span>
                          <span className="text-[10px] text-slate-400">Canvas está comprimiendo tu archivo...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                            Haz clic o arrastra para subir imágenes
                          </span>
                          <span className="text-[10px] text-slate-400">
                            JPEG, PNG de calidad profesional (Queda {3 - formImageUrls.length} libre)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual Alternative URL parameter */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Enlace Externo Alternativo (Opcional):</span>
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => {
                      setFormImageUrl(e.target.value);
                      if (e.target.value && !formImageUrls.includes(e.target.value)) {
                        setFormImageUrls(prev => {
                          if (prev.length < 3) return [...prev, e.target.value];
                          return prev;
                        });
                      }
                    }}
                    placeholder="O arrastra/pega un enlace de Unsplash..."
                    className="w-full bg-slate-50 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </form>

            {/* Form Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={dbSaving}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-2 hover:bg-emerald-500 rounded-lg text-xs font-semibold shadow transition cursor-pointer"
              >
                {dbSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={14} />
                    <span>Guardar Producto</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
