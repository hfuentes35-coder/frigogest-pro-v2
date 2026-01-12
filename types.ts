
export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  unit: string;
  shelfLifeDays: number;
}

export interface Batch {
  id: string;
  productId: string;
  batchCode: string;
  entryDate: string;
  expiryDate: string;
  initialQty: number;
  currentQty: number;
  receptionTemp: number;
  status: 'Available' | 'Quarantine' | 'Expired';
}

export interface Customer {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
  creditLimit: number;
  currentBalance: number;
  visitDay: number; // 1-7 (Mon-Sun)
}

export interface Sale {
  id: string;
  customerId: string;
  sellerId: string;
  date: string;
  total: number;
  deliveryFee?: number;
  paymentMethod: 'Cash' | 'Transfer' | 'Credit';
  paymentStatus: 'Paid' | 'Pending';
  deliveryStatus: 'Warehouse' | 'In Route' | 'Delivered' | 'Returned';
  returnLogs?: string[]; // Para trazabilidad persistente
}

export interface SaleDetail {
  id: string;
  saleId: string;
  productId: string;
  batchId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
