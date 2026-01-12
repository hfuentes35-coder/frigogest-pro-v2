
import React, { useState } from 'react';
import { dbService, DB_KEYS } from '../services/db';
import { Product, Batch, Category } from '../types';

const InventoryPanel: React.FC = () => {
  const [data, setData] = useState(dbService.getAllData());
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingPriceProduct, setEditingPriceProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const refreshData = () => setData(dbService.getAllData());

  const handleAddBatch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBatch: Batch = {
      id: Math.random().toString(36).substr(2, 9),
      productId: formData.get('productId') as string,
      batchCode: formData.get('batchCode') as string,
      entryDate: new Date().toISOString().split('T')[0],
      expiryDate: formData.get('expiryDate') as string,
      initialQty: Number(formData.get('qty')),
      currentQty: Number(formData.get('qty')),
      receptionTemp: Number(formData.get('temp')),
      status: 'Available',
    };

    const batches = dbService.get<Batch>(DB_KEYS.BATCHES);
    dbService.save(DB_KEYS.BATCHES, [...batches, newBatch]);
    setIsAddingBatch(false);
    refreshData();
  };

  const handleAddProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      categoryId: formData.get('categoryId') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      costPrice: Number(formData.get('costPrice')),
      salePrice: Number(formData.get('salePrice')),
      minStock: Number(formData.get('minStock')),
      unit: formData.get('unit') as string,
      shelfLifeDays: Number(formData.get('shelfLifeDays')),
    };

    const products = dbService.get<Product>(DB_KEYS.PRODUCTS);
    dbService.save(DB_KEYS.PRODUCTS, [...products, newProduct]);
    setIsAddingProduct(false);
    refreshData();
  };

  const handleUpdateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    const formData = new FormData(e.currentTarget);
    const updatedProduct: Product = {
      ...editingProduct,
      name: formData.get('name') as string,
      categoryId: formData.get('categoryId') as string,
      description: formData.get('description') as string,
      minStock: Number(formData.get('minStock')),
      unit: formData.get('unit') as string,
      shelfLifeDays: Number(formData.get('shelfLifeDays')),
      // Precios se mantienen o se podrían incluir aquí también
      costPrice: Number(formData.get('costPrice')),
      salePrice: Number(formData.get('salePrice')),
    };

    const products = dbService.get<Product>(DB_KEYS.PRODUCTS);
    const updatedProducts = products.map(p => p.id === editingProduct.id ? updatedProduct : p);
    
    dbService.save(DB_KEYS.PRODUCTS, updatedProducts);
    setEditingProduct(null);
    refreshData();
  };

  const handleUpdatePrices = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPriceProduct) return;
    
    const formData = new FormData(e.currentTarget);
    const costPrice = Number(formData.get('costPrice'));
    const salePrice = Number(formData.get('salePrice'));

    const products = dbService.get<Product>(DB_KEYS.PRODUCTS);
    const updatedProducts = products.map(p => 
      p.id === editingPriceProduct.id 
        ? { ...p, costPrice, salePrice } 
        : p
    );

    dbService.save(DB_KEYS.PRODUCTS, updatedProducts);
    setEditingPriceProduct(null);
    refreshData();
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el producto "${name}"?\n\nEsta acción también eliminará todos sus lotes asociados de forma permanente.`)) {
      dbService.deleteProduct(id);
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Control de Inventario</h2>
        <div className="flex space-x-3">
          <button 
            onClick={() => setIsAddingProduct(true)}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-2 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            + Nuevo Producto
          </button>
          <button 
            onClick={() => setIsAddingBatch(true)}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-700 transition-colors shadow-lg shadow-sky-100 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Registrar Lote
          </button>
        </div>
      </div>

      {/* Modal para Nuevo Producto */}
      {isAddingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 animate-in fade-in zoom-in duration-200 border border-white/20">
            <h3 className="text-2xl font-bold mb-6 text-slate-900">Configurar Nuevo Producto</h3>
            <form onSubmit={handleAddProduct} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Nombre del Producto</label>
                  <input name="name" required placeholder="Ej: Empanada de Maíz x 12" className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</label>
                  <select name="categoryId" required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium">
                    <option value="">Seleccione categoría...</option>
                    {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Precio Costo</label>
                  <input name="costPrice" type="number" required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Precio Venta</label>
                  <input name="salePrice" type="number" required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Stock Mínimo</label>
                  <input name="minStock" type="number" defaultValue="10" required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Unidad</label>
                  <select name="unit" required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium">
                    <option>Caja</option>
                    <option>Bolsa</option>
                    <option>Unidad</option>
                    <option>Paquete</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Días de Vida Útil</label>
                  <input name="shelfLifeDays" type="number" defaultValue="90" required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
              </div>
              <div className="flex space-x-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddingProduct(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all active:scale-95">Crear Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Producto Integral */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 animate-in fade-in zoom-in duration-200 border border-white/20">
            <h3 className="text-2xl font-bold mb-6 text-slate-900">Editar Producto</h3>
            <form onSubmit={handleUpdateProduct} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Nombre del Producto</label>
                  <input name="name" defaultValue={editingProduct.name} required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</label>
                  <select name="categoryId" defaultValue={editingProduct.categoryId} required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium">
                    {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Precio Costo</label>
                  <input name="costPrice" type="number" defaultValue={editingProduct.costPrice} required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Precio Venta</label>
                  <input name="salePrice" type="number" defaultValue={editingProduct.salePrice} required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Stock Mínimo</label>
                  <input name="minStock" type="number" defaultValue={editingProduct.minStock} required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Unidad</label>
                  <select name="unit" defaultValue={editingProduct.unit} required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium">
                    <option>Caja</option>
                    <option>Bolsa</option>
                    <option>Unidad</option>
                    <option>Paquete</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Días de Vida Útil</label>
                  <input name="shelfLifeDays" type="number" defaultValue={editingProduct.shelfLifeDays} required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
              </div>
              <div className="flex space-x-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all active:scale-95">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Actualizar Precios (Acceso Rápido) */}
      {editingPriceProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200 border border-white/20">
            <h3 className="text-2xl font-bold mb-2 text-slate-900">Actualizar Precios</h3>
            <p className="text-sm text-slate-500 mb-6">{editingPriceProduct.name}</p>
            
            <form onSubmit={handleUpdatePrices} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Precio Costo</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <input 
                    name="costPrice" 
                    type="number" 
                    required 
                    defaultValue={editingPriceProduct.costPrice}
                    className="w-full border-slate-200 rounded-xl p-3 pl-8 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-bold text-slate-700" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Precio Venta</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <input 
                    name="salePrice" 
                    type="number" 
                    required 
                    defaultValue={editingPriceProduct.salePrice}
                    className="w-full border-slate-200 rounded-xl p-3 pl-8 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-700" 
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setEditingPriceProduct(null)} className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Nuevo Lote */}
      {isAddingBatch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200 border border-white/20">
            <h3 className="text-2xl font-bold mb-6 text-slate-900">Nuevo Ingreso de Mercancía</h3>
            <form onSubmit={handleAddBatch} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Producto</label>
                <select name="productId" required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium">
                  <option value="">Seleccione producto...</option>
                  {data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Código Lote</label>
                  <input name="batchCode" required placeholder="Ex: L-001" className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Temp. Recepción</label>
                  <input name="temp" type="number" step="0.1" defaultValue="-18" className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Cantidad</label>
                  <input name="qty" type="number" required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Vencimiento</label>
                  <input name="expiryDate" type="date" required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
              </div>
              <div className="flex space-x-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddingBatch(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all active:scale-95">Guardar Lote</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.products.map(product => {
          const productBatches = data.batches.filter(b => b.productId === product.id);
          const totalStock = productBatches.reduce((acc, b) => acc + b.currentQty, 0);
          const isCritical = totalStock < product.minStock;

          return (
            <div key={product.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col hover:border-sky-100 transition-colors relative group/card">
              <div className="p-5 bg-slate-50/50 border-b border-slate-200 flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-slate-900 leading-tight">{product.name}</h3>
                    <div className="flex space-x-1 opacity-0 group-hover/card:opacity-100 transition-all">
                      <button 
                        onClick={() => setEditingProduct(product)}
                        className="text-slate-300 hover:text-sky-500 p-1.5 rounded-lg hover:bg-sky-50 transition-all"
                        title="Editar Producto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button 
                        onClick={() => setEditingPriceProduct(product)}
                        className="text-slate-300 hover:text-emerald-500 p-1.5 rounded-lg hover:bg-emerald-50 transition-all"
                        title="Editar Precios"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                        title="Eliminar Producto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    {data.categories.find(c => c.id === product.categoryId)?.name}
                  </p>
                </div>
                <div className={`text-right ${isCritical ? 'text-red-600' : 'text-sky-600'}`}>
                  <p className="text-3xl font-black">{totalStock}</p>
                  <p className="text-[10px] uppercase font-black tracking-tighter">{product.unit}s</p>
                </div>
              </div>
              
              <div className="flex-1 p-5 overflow-y-auto max-h-56 custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 uppercase tracking-widest font-black text-[9px] border-b border-slate-100">
                      <th className="pb-3">Lote</th>
                      <th className="pb-3">Vence</th>
                      <th className="pb-3 text-right">Stock</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {productBatches.map(batch => {
                      const isExpired = new Date(batch.expiryDate) < new Date();
                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-bold text-slate-700">{batch.batchCode}</td>
                          <td className="py-3 text-slate-500">{batch.expiryDate}</td>
                          <td className="py-3 text-right font-black text-slate-900">{batch.currentQty}</td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} font-black uppercase text-[8px] tracking-tighter`}>
                              {isExpired ? 'Exp' : 'Vig'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {productBatches.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-300 italic">Sin lotes activos</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex justify-between items-center text-[10px]">
                <div className="flex flex-col">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">Venta: <span className="text-emerald-600">${product.salePrice.toLocaleString()}</span></span>
                  <span className="text-slate-400">Costo: <span className="font-bold text-slate-600">${product.costPrice.toLocaleString()}</span></span>
                </div>
                <div className="text-right">
                   <span className="text-slate-400 block">Min. Requerido: <span className="font-bold text-slate-600">{product.minStock}</span></span>
                   <span className="text-[9px] text-sky-500 font-bold uppercase">Rent: {Math.round(((product.salePrice - product.costPrice) / (product.costPrice || 1)) * 100)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryPanel;
