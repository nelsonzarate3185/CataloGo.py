export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'buyer' | 'super_admin';
  createdAt: string;
  status?: 'pending_approval' | 'active' | 'blocked' | 'blocked_unpaid' | 'suspended'; // Block, Active, Pending, Unpaid, Suspended (Baja) states
  
  // CataloGo Specific Vendor Profile Columns
  slug?: string;
  businessName?: string;
  whatsapp?: string;         // e.g. 595XXXXXXXXX
  city?: string;
  address?: string;
  ruc?: string;
  logoUrl?: string;
  description?: string;
  plan?: string; // dynamically matches plan configurations
  planExpiresAt?: string;
  catalogViews?: number;
}

export interface Category {
  id: string;
  vendorId: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // PYG / Guaraníes (No decimal)
  stock: number;
  category: string;
  imageUrl: string;
  imageUrls?: string[]; // Supports up to 3 images per product
  viewsCount: number;
  ownerId: string; // Maps to vendor_id
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  productLimit: number; // Maximum number of products allowed, e.g. 5, 200, etc.
  features: string[];
  description: string;
}

export interface PlanRequest {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  requestedPlanId: string;
  requestedPlanName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  vendorId: string; // The seller who receives the order
  buyerName: string;
  buyerNote?: string;
  buyerUid?: string; // Links order to registered buyer
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  deliveryAddress?: string;
  paymentMethod?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}
