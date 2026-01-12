
import React, { useState, useMemo } from 'react';
import { dbService } from '../services/db';
import { Customer, Product, Batch, Sale } from '../types';

const SellerApp: React.FC = () => {
  const [data, setData] = useState(dbService.getAllData());
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer' | 'Credit'>('Cash');

  const filteredProducts = useMemo(() => {
    return data.products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data.products, searchTerm]);

  const updateCart = (productId: string, delta: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const totalCart = useMemo(() => {
    return (Object.entries(cart) as [string, number][]).reduce((acc, [pid, qty]) => {
      const p = data.products.find(prod => prod.id === pid)!;
      return acc + (p.salePrice * qty);
    }, 0);
  }, [cart, data.products]);

  const handleConfirmOrder = () => {
    if (!selectedCustomerId || Object.keys(cart).length === 0) return;

    const details: any[] = [];
    let hasError = false;

    (Object.entries(cart) as [string, number][]).forEach(([pid, qty]) => {
      const batch = dbService.getFefoBatch(pid, qty);
      if (!batch) {
        alert(`Stock insuficiente para ${data.products.find(p => p.id === pid)?.name}`);
        hasError = true;
        return;
      }
      const p = data.products.find(prod => prod.id === pid)!;
      details.push({
        productId: pid,
        batchId: batch.id,
        quantity: qty,
        unitPrice: p.salePrice,
        subtotal: p.salePrice * qty
      });
    });

    if (hasError) return;

    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: selectedCustomerId,
      sellerId: 'vendedor_movil',
      date: new Date().toISOString(),
      total: totalCart,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'Credit' ? 'Pending' : 'Paid',
      deliveryStatus: 'In Route', // Actualizado para consistencia
    };

    dbService.createSale(newSale, details);
    setCart({});
    setSelectedCustomerId('');
    setIsCheckoutOpen(false);
    setData(dbService.getAllData());
    alert("¡Pedido confirmado y enviado a ruta!");
  };

  const selectedCustomer = data.customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-32 flex flex-col">
      <header className="bg-sky-600 p-6 text-white shadow-lg sticky top-0 z-20">
        <h1 className="text-xl font-bold flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          App de Preventa
        </h1>
        <div className="mt-4 space-y-3">
          <select 
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-sky-700 text-white border-none rounded-xl p-3 focus:ring-2 focus:ring-sky-300 outline-none"
          >
            <option value="">Seleccione Cliente...</option>
            {data.customers.map(c => (
              <option key={c.id} value={c.id}>{c.businessName}</option>
            ))}
          </select>
          {selectedCustomer && (
            <div className="bg-sky-500/30 p-2 rounded-lg text-xs flex justify-between">
              <span>Cartera: ${selectedCustomer.currentBalance.toLocaleString()}</span>
              <span>Cupo: ${(selectedCustomer.creditLimit - selectedCustomer.currentBalance).toLocaleString()}</span>
            </div>
          )}
        </div>
      </header>

      <div className="p-4 flex-1">
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            className="w-full p-4 pl-12 rounded-2xl bg-white border border-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-sky-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>

        <div className="space-y-4">
          {filteredProducts.map(p => {
            const stock = data.batches.filter(b => b.productId === p.id).reduce((acc, b) => acc + b.currentQty, 0);
            const qtyInCart = cart[p.id] || 0;
            return (
              <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  <p className="text-sky-600 font-bold">${p.salePrice.toLocaleString()}</p>
                  <p className={`text-[10px] font-bold uppercase ${stock < 10 ? 'text-red-500' : 'text-slate-400'}`}>
                    Stock: {stock} {p.unit}s
                  </p>
                </div>
                <div className="flex items-center bg-slate-100 rounded-xl p-1">
                  <button onClick={() => updateCart(p.id, -1)} className="p-2 text-slate-600 hover:text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg></button>
                  <span className="w-8 text-center font-bold text-slate-800">{qtyInCart}</span>
                  <button onClick={() => updateCart(p.id, 1)} className="p-2 text-slate-600 hover:text-sky-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalCart > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-30">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Pedido</p>
              <p className="text-xl font-black text-slate-900">${totalCart.toLocaleString()}</p>
            </div>
            <button 
              onClick={() => setIsCheckoutOpen(true)}
              className="bg-sky-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-sky-200 active:scale-95 transition-transform"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-8 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <h2 className="text-xl font-bold mb-6">Confirmar Pedido</h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['Cash', 'Transfer', 'Credit'].map(m => (
                    <button 
                      key={m}
                      onClick={() => setPaymentMethod(m as any)}
                      className={`p-3 rounded-xl text-sm font-bold border-2 transition-all ${paymentMethod === m ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-100 text-slate-600'}`}
                    >
                      {m === 'Cash' ? 'Efectivo' : m === 'Transfer' ? 'Transf.' : 'Crédito'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button onClick={() => setIsCheckoutOpen(false)} className="flex-1 p-4 rounded-2xl border border-slate-200 font-bold text-slate-600">Volver</button>
              <button onClick={handleConfirmOrder} className="flex-1 p-4 rounded-2xl bg-sky-600 text-white font-bold shadow-lg">Finalizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerApp;
