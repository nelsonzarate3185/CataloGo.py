import { createClient } from '@supabase/supabase-js';

// Initialization of Supabase with VITE_ prefixed environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("🚀 Supabase Client Initialized Successfully!");
  } catch (e) {
    console.error("⚠️ Failed to initialize Supabase client:", e);
  }
} else {
  console.warn("⚠️ Supabase credentials missing. Running in Offline-First LocalCache mode.");
}

// Supported operation types for logging error contexts
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  console.error(`Supabase DB ${operationType} Error on ${path}:`, error);
  throw new Error(error instanceof Error ? error.message : String(error));
}

// Mock Firestore DB placeholder
export const db = { name: 'supabase_emulated_db' };

// --- Auth State Coordinator ---
class MockAuth {
  private listeners: ((user: any) => void)[] = [];
  currentUser: any = null;

  constructor() {
    if (supabase) {
      // Subscribe to Supabase auth events
      supabase.auth.onAuthStateChange((event: string, session: any) => {
        const user = session?.user;
        this.updateUser(user);
      });

      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (session?.user) {
          this.updateUser(session.user);
        } else {
          this.loadCachedUser();
        }
      });
    } else {
      this.loadCachedUser();
    }
  }

  private loadCachedUser() {
    const cached = localStorage.getItem('supabase_emulated_user');
    if (cached) {
      this.currentUser = JSON.parse(cached);
    }
  }

  updateUser(user: any) {
    if (user) {
      this.currentUser = {
        uid: user.id || user.uid,
        email: user.email,
        displayName: user.user_metadata?.displayName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Vendedor',
        photoURL: user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80',
        emailVerified: true,
        isAnonymous: false,
        tenantId: null,
        providerData: []
      };
      localStorage.setItem('supabase_emulated_user', JSON.stringify(this.currentUser));
    } else {
      this.currentUser = null;
      localStorage.removeItem('supabase_emulated_user');
    }
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
}

export const auth = new MockAuth();
export type User = any;

// Re-export Auth hook triggers to retain identical controller APIs
export const onAuthStateChanged = (authObj: typeof auth, callback: (user: any) => void) => {
  return authObj.onAuthStateChanged(callback);
};

export async function signInWithGoogle() {
  if (supabase) {
    const url = window.location.origin + window.location.pathname;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: url }
    });
    if (error) throw error;
    return data;
  } else {
    const mockUser = {
      uid: 'google_user_123',
      email: 'nelsonzarate3185@gmail.com',
      displayName: 'Nelson Zárate',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'
    };
    auth.updateUser(mockUser);
    return { user: mockUser };
  }
}

export async function signUpEmail(email: string, password: string) {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) auth.updateUser(data.user);
    return data;
  } else {
    const mockUser = {
      uid: 'email_user_' + Math.random().toString(36).substring(2, 9),
      email,
      displayName: email.split('@')[0],
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'
    };
    auth.updateUser(mockUser);
    return { user: mockUser };
  }
}

export async function signInEmail(email: string, password: string) {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) auth.updateUser(data.user);
    return data;
  } else {
    const mockUser = {
      uid: 'email_user_123',
      email,
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'
    };
    auth.updateUser(mockUser);
    return { user: mockUser };
  }
}

export async function resetPassword(email: string) {
  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }
  return true;
}

export async function changePassword(password: string) {
  if (supabase) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }
  return true;
}

export async function logout() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  auth.updateUser(null);
  return true;
}


// --- Database Layer: Supabase with LocalStorage cache fallback ---

function getLocalCollection(collectionName: string): any[] {
  const data = localStorage.getItem(`sqldata_${collectionName}`);
  return data ? JSON.parse(data) : [];
}

function setLocalCollection(collectionName: string, data: any[]) {
  localStorage.setItem(`sqldata_${collectionName}`, JSON.stringify(data));
  notifyListeners(collectionName);
}

// Global active snapshot listeners
const activeListeners = new Set<{
  target: any;
  onNext: (snap: any) => void;
}>();

function notifyListeners(collectionName: string) {
  for (const listener of activeListeners) {
    const { target, onNext } = listener;
    if (target.collectionName === collectionName || target.collection === collectionName) {
      if (target.type === 'doc') {
        const list = getLocalCollection(collectionName);
        const item = list.find(x => (x.id === target.id || x.uid === target.id));
        onNext({
          id: target.id,
          exists: () => !!item,
          data: () => item || null
        });
      } else {
        const list = getLocalCollection(collectionName);
        const filtered = target.type === 'query' ? applyQueryClauses(list, target.clauses) : list;
        const docs = filtered.map(x => ({
          id: x.id || x.uid,
          data: () => x,
          exists: () => true
        }));
        onNext({
          docs,
          empty: docs.length === 0,
          forEach: (cb: any) => docs.forEach(cb),
          size: docs.length
        });
      }
    }
  }
}

function applyQueryClauses(dataList: any[], clauses: any[]): any[] {
  let list = [...dataList];
  for (const clause of clauses) {
    if (clause.type === 'where') {
      const { field, operator, value } = clause;
      list = list.filter(item => {
        const itemVal = item[field];
        if (operator === '==' || operator === '===') {
          return itemVal === value;
        }
        if (operator === 'in') {
          return Array.isArray(value) && value.includes(itemVal);
        }
        if (operator === '!=') {
          return itemVal !== value;
        }
        if (operator === '>') {
          return itemVal > value;
        }
        if (operator === '<') {
          return itemVal < value;
        }
        if (operator === '>=') {
          return itemVal >= value;
        }
        if (operator === '<=') {
          return itemVal <= value;
        }
        return true;
      });
    } else if (clause.type === 'limit') {
      list = list.slice(0, clause.value);
    }
  }
  return list;
}

// Background poller: syncs Supabase cloud data into local cache
async function syncCollectionFromSupabase(collectionName: string) {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.from(collectionName).select('*');
    if (!error && data) {
      const formatted = data.map((row: any) => {
        const record = row.data ? { id: row.id || row.uid, ...row.data } : row;
        if (collectionName === 'users' && !record.uid) record.uid = row.id || row.uid;
        if (collectionName !== 'users' && !record.id) record.id = row.id;
        return record;
      });

      // Merge: server data wins (role/status are admin-controlled),
      // local-only rows (optimistic inserts not yet on server) are preserved.
      const local = getLocalCollection(collectionName);
      const mergedMap = new Map();
      local.forEach(item => mergedMap.set(item.id || item.uid, item));
      formatted.forEach((item: any) => {
        mergedMap.set(item.id || item.uid, item); // server always overwrites
      });

      const finalData = Array.from(mergedMap.values());
      localStorage.setItem(`sqldata_${collectionName}`, JSON.stringify(finalData));
      notifyListeners(collectionName);
    }
  } catch (err) {
    // Fail silently to keep user session smooth
  }
}

// Initial sync + 10-second polling for all application tables
const syncTables = ['users', 'products', 'categories', 'orders', 'plans', 'plan_requests'];
syncTables.forEach(t => {
  syncCollectionFromSupabase(t);
  setInterval(() => {
    syncCollectionFromSupabase(t);
  }, 10000);
});

// Sync local write back to Supabase Cloud
async function syncWriteToSupabase(collectionName: string, id: string, docData: any, isDelete = false) {
  if (!supabase) return;
  try {
    if (isDelete) {
      await supabase.from(collectionName).delete().eq(collectionName === 'users' ? 'uid' : 'id', id);
    } else {
      const payload: any = { data: docData };
      if (collectionName === 'users') {
        payload.uid = id;
        payload.email = docData.email || '';
        payload.slug = docData.slug || '';
        payload.business_name = docData.businessName || '';
        payload.role = docData.role || 'admin';
      } else {
        payload.id = id;
        if (collectionName === 'products') {
          payload.owner_id = docData.ownerId || '';
          payload.name = docData.name || '';
          payload.price = docData.price || 0;
        } else if (collectionName === 'categories') {
          payload.vendor_id = docData.vendorId || '';
          payload.name = docData.name || '';
        } else if (collectionName === 'orders') {
          payload.vendor_id = docData.vendorId || '';
        }
      }
      await supabase.from(collectionName).upsert(payload);
    }
  } catch (err) {
    console.warn(`Supabase cloud sync deferred for ${collectionName}/${id}:`, err);
  }
}


// --- Firestore-compatible API (used throughout the app) ---

export function doc(dbObj: typeof db, collectionName: string, id: string) {
  return { type: 'doc', collection: collectionName, collectionName, id };
}

export function collection(dbObj: typeof db, collectionName: string) {
  return { type: 'collection', collection: collectionName, collectionName };
}

export function query(collectionRef: any, ...clauses: any[]) {
  return {
    type: 'query',
    collection: collectionRef.collectionName,
    collectionName: collectionRef.collectionName,
    clauses
  };
}

export function where(field: string, operator: string, value: any) {
  return { type: 'where', field, operator, value };
}

export function limit(value: number) {
  return { type: 'limit', value };
}

export async function setDoc(docRef: any, data: any) {
  const col = docRef.collectionName;
  const id = docRef.id;
  const list = getLocalCollection(col);

  const newList = list.filter(x => (x.id || x.uid) !== id);
  const formattedRecord = { ...data };
  if (col === 'users') {
    formattedRecord.uid = id;
  } else {
    formattedRecord.id = id;
  }
  newList.push(formattedRecord);

  setLocalCollection(col, newList);
  await syncWriteToSupabase(col, id, formattedRecord);
}

export async function updateDoc(docRef: any, data: any) {
  const col = docRef.collectionName;
  const id = docRef.id;
  const list = getLocalCollection(col);

  const existingIndex = list.findIndex(x => (x.id || x.uid) === id);
  if (existingIndex !== -1) {
    const updated = { ...list[existingIndex], ...data };
    list[existingIndex] = updated;
    setLocalCollection(col, [...list]);
    await syncWriteToSupabase(col, id, updated);
  } else {
    const updated = { ...data };
    if (col === 'users') updated.uid = id;
    else updated.id = id;
    list.push(updated);
    setLocalCollection(col, list);
    await syncWriteToSupabase(col, id, updated);
  }
}

export async function addDoc(collectionRef: any, data: any) {
  const col = collectionRef.collectionName;
  const id = 'doc_' + Math.random().toString(36).substring(2, 11);
  const list = getLocalCollection(col);

  const formattedRecord = { id, ...data };
  list.push(formattedRecord);

  setLocalCollection(col, list);
  await syncWriteToSupabase(col, id, formattedRecord);
  return { id };
}

export async function deleteDoc(docRef: any) {
  const col = docRef.collectionName;
  const id = docRef.id;
  const list = getLocalCollection(col);

  const newList = list.filter(x => (x.id || x.uid) !== id);
  setLocalCollection(col, newList);
  await syncWriteToSupabase(col, id, null, true);
}

export function onSnapshot(target: any, onNext: (snap: any) => void, onError?: (err: any) => void) {
  const listener = { target, onNext };
  activeListeners.add(listener);

  // Trigger initial snapshot immediately
  const col = target.collectionName || target.collection;
  const list = getLocalCollection(col);

  if (target.type === 'doc') {
    const item = list.find(x => (x.id === target.id || x.uid === target.id));
    onNext({
      id: target.id,
      exists: () => !!item,
      data: () => item || null
    });
  } else {
    const filtered = target.type === 'query' ? applyQueryClauses(list, target.clauses) : list;
    const docs = filtered.map(x => ({
      id: x.id || x.uid,
      data: () => x,
      exists: () => true
    }));
    onNext({
      docs,
      empty: docs.length === 0,
      forEach: (cb: any) => docs.forEach(cb),
      size: docs.length
    });
  }

  return () => {
    activeListeners.delete(listener);
  };
}
