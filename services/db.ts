
import { Product, Category, Batch, Customer, Sale, SaleDetail } from '../types';

const DB_KEYS = {
  PRODUCTS: 'frigogest_products',
  CATEGORIES: 'frigogest_categories',
  BATCHES: 'frigogest_batches',
  CUSTOMERS: 'frigogest_customers',
  SALES: 'frigogest_sales',
  SALE_DETAILS: 'frigogest_sale_details',
};

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Empanadas', description: 'Empanadas listas para freir' },
  { id: '2', name: 'Deditos', description: 'Deditos de queso y bocadillo' },
  { id: '3', name: 'Papas', description: 'Papas precocidas congeladas' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', categoryId: '1', name: 'Empanada de Carne x 10', description: 'Caja de 10 unidades', costPrice: 8000, salePrice: 15000, minStock: 20, unit: 'Caja', shelfLifeDays: 90 },
  { id: 'p2', categoryId: '2', name: 'Dedito de Queso x 20', description: 'Bolsa de 20 unidades', costPrice: 12000, salePrice: 22000, minStock: 15, unit: 'Bolsa', shelfLifeDays: 120 },
  { id: 'p3', categoryId: '1', name: 'Empanada de Pollo x 10', description: 'Caja de 10 unidades', costPrice: 8500, salePrice: 16000, minStock: 20, unit: 'Caja', shelfLifeDays: 90 },
];

const INITIAL_BATCHES: Batch[] = [
  { id: 'b1', productId: 'p1', batchCode: 'LOTE-001', entryDate: '2024-03-01', expiryDate: '2025-06-01', initialQty: 100, currentQty: 85, receptionTemp: -18.5, status: 'Available' },
  { id: 'b2', productId: 'p2', batchCode: 'LOTE-002', entryDate: '2024-03-05', expiryDate: '2025-07-05', initialQty: 50, currentQty: 40, receptionTemp: -19.0, status: 'Available' },
  { id: 'b3', productId: 'p3', batchCode: 'LOTE-003', entryDate: '2024-04-01', expiryDate: '2024-04-20', initialQty: 30, currentQty: 12, receptionTemp: -18.2, status: 'Available' },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', businessName: 'Tienda La Bendición', contactPerson: 'Marta Lucia', phone: '3101234567', address: 'Calle 10 # 5-20', city: 'Barranquilla', coordinates: { lat: 10.963, lng: -74.796 }, creditLimit: 200000, currentBalance: 50000, visitDay: 1 },
  { id: 'c2', businessName: 'Restaurante El Paisa', contactPerson: 'Juan Carlos', phone: '3209876543', address: 'Cra 43 # 80-10', city: 'Barranquilla', coordinates: { lat: 11.002, lng: -74.808 }, creditLimit: 500000, currentBalance: 0, visitDay: 2 },
  { id: 'c3', businessName: 'Supermercado 24/7', contactPerson: 'Elena Rivas', phone: '3004445566', address: 'Cl. 72 #46-32', city: 'Barranquilla', coordinates: { lat: 10.995, lng: -74.815 }, creditLimit: 1500000, currentBalance: 320000, visitDay: 1 },
];

export const dbService = {
  init: () => {
    Object.entries(DB_KEYS).forEach(([key, storageKey]) => {
      if (!localStorage.getItem(storageKey)) {
        let initialData: any = [];
        if (storageKey === DB_KEYS.CATEGORIES) initialData = INITIAL_CATEGORIES;
        if (storageKey === DB_KEYS.PRODUCTS) initialData = INITIAL_PRODUCTS;
        if (storageKey === DB_KEYS.BATCHES) initialData = INITIAL_BATCHES;
        if (storageKey === DB_KEYS.CUSTOMERS) initialData = INITIAL_CUSTOMERS;
        localStorage.setItem(storageKey, JSON.stringify(initialData));
      }
    });
  },

  resetData: (full: boolean = false) => {
    if (full) {
      localStorage.clear();
      dbService.init();
    } else {
      const currentProducts = dbService.get<Product>(DB_KEYS.PRODUCTS);
      const currentCustomers = dbService.get<Customer>(DB_KEYS.CUSTOMERS);

      INITIAL_PRODUCTS.forEach(p => {
        if (!currentProducts.find(cp => cp.id === p.id)) currentProducts.push(p);
      });
      INITIAL_CUSTOMERS.forEach(c => {
        if (!currentCustomers.find(cc => cc.id === c.id)) currentCustomers.push(c);
      });

      dbService.save(DB_KEYS.PRODUCTS, currentProducts);
      dbService.save(DB_KEYS.CUSTOMERS, currentCustomers);
    }
  },

  repairDatabase: () => {
    console.log("%c[MANTENIMIENTO] Iniciando reparación de integridad...", "color: #0ea5e9; font-weight: bold;");
    const sales = dbService.get<Sale>(DB_KEYS.SALES);
    const customers = dbService.get<Customer>(DB_KEYS.CUSTOMERS);

    const updatedCustomers = customers.map(c => ({ ...c, currentBalance: 0 }));

    sales.forEach(sale => {
      if (sale.paymentMethod === 'Credit' && sale.paymentStatus === 'Pending' && sale.deliveryStatus !== 'Returned') {
        const custIndex = updatedCustomers.findIndex(c => c.id === sale.customerId);
        if (custIndex !== -1) {
          updatedCustomers[custIndex].currentBalance += sale.total;
        }
      }
    });

    dbService.save(DB_KEYS.CUSTOMERS, updatedCustomers);
    console.log("%c[OK] Saldos de clientes recalculados con éxito.", "color: #10b981;");
  },

  get: <T,>(key: string): T[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      console.error(`Error leyendo ${key}`, e);
      return [];
    }
  },
  
  save: <T,>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data)),

  getAllData: () => ({
    categories: dbService.get<Category>(DB_KEYS.CATEGORIES),
    products: dbService.get<Product>(DB_KEYS.PRODUCTS),
    batches: dbService.get<Batch>(DB_KEYS.BATCHES),
    customers: dbService.get<Customer>(DB_KEYS.CUSTOMERS),
    sales: dbService.get<Sale>(DB_KEYS.SALES),
    saleDetails: dbService.get<SaleDetail>(DB_KEYS.SALE_DETAILS),
  }),

  deleteCustomer: (id: string) => {
    const customers = dbService.get<Customer>(DB_KEYS.CUSTOMERS);
    const filtered = customers.filter(c => c.id !== id);
    dbService.save(DB_KEYS.CUSTOMERS, filtered);
  },

  deleteProduct: (id: string) => {
    const products = dbService.get<Product>(DB_KEYS.PRODUCTS);
    const batches = dbService.get<Batch>(DB_KEYS.BATCHES);
    
    const filteredProducts = products.filter(p => p.id !== id);
    const filteredBatches = batches.filter(b => b.productId !== id);
    
    dbService.save(DB_KEYS.PRODUCTS, filteredProducts);
    dbService.save(DB_KEYS.BATCHES, filteredBatches);
  },

  getFefoBatch: (productId: string, quantity: number): Batch | null => {
    const batches = dbService.get<Batch>(DB_KEYS.BATCHES)
      .filter(b => b.productId === productId && b.currentQty >= quantity && b.status === 'Available')
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    return batches[0] || null;
  },

  createSale: (sale: Sale, details: Omit<SaleDetail, 'id' | 'saleId'>[]) => {
    const sales = dbService.get<Sale>(DB_KEYS.SALES);
    const saleDetails = dbService.get<SaleDetail>(DB_KEYS.SALE_DETAILS);
    const batches = dbService.get<Batch>(DB_KEYS.BATCHES);
    const customers = dbService.get<Customer>(DB_KEYS.CUSTOMERS);

    const newDetails: SaleDetail[] = details.map(d => {
      const batchIndex = batches.findIndex(b => b.id === d.batchId);
      if (batchIndex !== -1) {
        batches[batchIndex].currentQty -= d.quantity;
      }
      return { ...d, id: Math.random().toString(36).substr(2, 9), saleId: sale.id };
    });

    if (sale.paymentMethod === 'Credit') {
      const custIndex = customers.findIndex(c => c.id === sale.customerId);
      if (custIndex !== -1) {
        customers[custIndex].currentBalance += sale.total;
      }
    }

    dbService.save(DB_KEYS.BATCHES, batches);
    dbService.save(DB_KEYS.SALE_DETAILS, [...saleDetails, ...newDetails]);
    dbService.save(DB_KEYS.SALES, [...sales, sale]);
    dbService.save(DB_KEYS.CUSTOMERS, customers);
  },

  updateSale: (saleId: string, updates: Partial<Sale>) => {
    const sales = dbService.get<Sale>(DB_KEYS.SALES);
    const customers = dbService.get<Customer>(DB_KEYS.CUSTOMERS);
    const index = sales.findIndex(s => s.id === saleId);
    
    if (index !== -1) {
      const oldSale = sales[index];
      const newSale = { ...oldSale, ...updates };
      
      if (oldSale.paymentStatus === 'Pending' && newSale.paymentStatus === 'Paid') {
        const custIndex = customers.findIndex(c => c.id === newSale.customerId);
        if (custIndex !== -1) {
          customers[custIndex].currentBalance = Math.max(0, customers[custIndex].currentBalance - newSale.total);
        }
      }
      
      sales[index] = newSale;
      dbService.save(DB_KEYS.SALES, sales);
      dbService.save(DB_KEYS.CUSTOMERS, customers);
    }
  },

  processReturn: (saleId: string, returns: { detailId: string; quantity: number }[], reason: string) => {
    const sales = dbService.get<Sale>(DB_KEYS.SALES);
    const saleDetails = dbService.get<SaleDetail>(DB_KEYS.SALE_DETAILS);
    const batches = dbService.get<Batch>(DB_KEYS.BATCHES);
    const customers = dbService.get<Customer>(DB_KEYS.CUSTOMERS);
    const products = dbService.get<Product>(DB_KEYS.PRODUCTS);

    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) return;

    const sale = sales[saleIndex];
    const saleLogs: string[] = sale.returnLogs || [];
    let totalCredit = 0;
    const timestamp = new Date().toLocaleString();

    returns.forEach(ret => {
      const detailIndex = saleDetails.findIndex(sd => sd.id === ret.detailId);
      if (detailIndex !== -1) {
        const detail = saleDetails[detailIndex];
        const product = products.find(p => p.id === detail.productId);
        const batchIndex = batches.findIndex(b => b.id === detail.batchId);
        
        if (batchIndex !== -1) {
          const batch = batches[batchIndex];
          batch.currentQty += ret.quantity;
          const logMsg = `Restauradas ${ret.quantity} unidades de "${product?.name}" al Lote: ${batch.batchCode}.`;
          saleLogs.push(`${timestamp}: ${logMsg}`);
        }
        totalCredit += (detail.unitPrice * ret.quantity);
      }
    });

    const custIndex = customers.findIndex(c => c.id === sale.customerId);
    if (custIndex !== -1) {
      customers[custIndex].currentBalance = Math.max(0, customers[custIndex].currentBalance - totalCredit);
    }

    sales[saleIndex].deliveryStatus = 'Returned';
    sales[saleIndex].returnLogs = saleLogs;

    dbService.save(DB_KEYS.BATCHES, batches);
    dbService.save(DB_KEYS.SALES, sales);
    dbService.save(DB_KEYS.CUSTOMERS, customers);
  },

  importHierarchicalData: (importData: any[]) => {
    const categories = dbService.get<Category>(DB_KEYS.CATEGORIES);
    const products = dbService.get<Product>(DB_KEYS.PRODUCTS);
    const batches = dbService.get<Batch>(DB_KEYS.BATCHES);

    importData.forEach(row => {
      let cat = categories.find(c => c.name.toLowerCase() === row.category.toLowerCase());
      if (!cat) {
        cat = { id: Math.random().toString(36).substr(2, 9), name: row.category, description: 'Imported Category' };
        categories.push(cat);
      }

      let prod = products.find(p => p.name.toLowerCase() === row.productName.toLowerCase());
      if (!prod) {
        prod = {
          id: Math.random().toString(36).substr(2, 9),
          categoryId: cat.id,
          name: row.productName,
          description: 'Imported Product',
          costPrice: row.costPrice || 0,
          salePrice: row.salePrice || 0,
          minStock: 10,
          unit: 'Unidad',
          shelfLifeDays: 90
        };
        products.push(prod);
      }

      const newBatch: Batch = {
        id: Math.random().toString(36).substr(2, 9),
        productId: prod.id,
        batchCode: row.batchCode || `IMP-${Date.now()}`,
        entryDate: new Date().toISOString().split('T')[0],
        expiryDate: row.expiryDate,
        initialQty: row.quantity,
        currentQty: row.quantity,
        receptionTemp: row.temp || -18,
        status: 'Available'
      };
      batches.push(newBatch);
    });

    dbService.save(DB_KEYS.CATEGORIES, categories);
    dbService.save(DB_KEYS.PRODUCTS, products);
    dbService.save(DB_KEYS.BATCHES, batches);
  }
};

export { DB_KEYS };
