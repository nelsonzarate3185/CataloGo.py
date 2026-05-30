import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Folder, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Category } from '../types';
import { db, OperationType, handleFirestoreError, collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryManagerProps {
  currentUserId: string;
}

export default function CategoryManager({ currentUserId }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorStatus, setErrorStatus] = useState('');

  // Sincronizar categorías del vendedor desde Firestore en tiempo real
  useEffect(() => {
    const q = query(
      collection(db, 'categories'),
      where('vendorId', '==', currentUserId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Category[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Category);
      });
      // Ordenar por sortOrder o nombre
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      setCategories(list);
    }, (err) => {
      console.error(err);
      handleFirestoreError(err, OperationType.LIST, 'categories');
    });

    return () => unsub();
  }, [currentUserId]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSaving(true);
    setErrorStatus('');
    const id = 'cat_' + Math.random().toString(36).substring(2, 11);
    
    const newCategory: Category = {
      id,
      vendorId: currentUserId,
      name: newCatName.trim(),
      sortOrder: categories.length + 1
    };

    try {
      await setDoc(doc(db, 'categories', id), newCategory);
      setNewCatName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `categories/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  };

  return (
    <div id="category-manager-root" className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Gestión de Categorías</h2>
        <p className="text-sm text-slate-500 dark:text-slate-405">Crea y organiza las categorías de tus productos para facilitar la navegación a los compradores.</p>
      </div>

      {/* Formulario de creación */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
        <form onSubmit={handleCreateCategory} className="flex gap-4">
          <div className="flex-1 space-y-1">
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Ej: Calzado Deportivo, Ropa de Verano, Accesorios..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newCatName.trim()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-505 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-450 text-white font-bold px-5 rounded-xl text-sm transition cursor-pointer shrink-0 shadow-sm"
          >
            <Plus size={16} />
            <span>Agregar</span>
          </button>
        </form>

        {errorStatus && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorStatus}</span>
          </div>
        )}
      </div>

      {/* Lista de Categorías */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tus Categorías Guardadas</span>
          <span className="text-xs font-mono text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
            {categories.length} {categories.length === 1 ? 'Categoría' : 'Categorías'}
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <AnimatePresence>
            {categories.map((cat, index) => (
              <motion.div
                layout
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Folder size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-850 dark:text-white text-sm">{cat.name}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">Orden de visualización: #{index + 1}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                  title="Eliminar Categoría"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {categories.length === 0 && (
            <div className="p-8 text-center text-slate-450 dark:text-slate-500 text-sm">
              <Sparkles className="mx-auto text-emerald-500 mb-2 animate-pulse" size={28} />
              No has configurado categorías personalizadas. Agrega la primera arriba.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
