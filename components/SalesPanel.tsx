
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { dbService } from '../services/db';
import { Customer, Product, Batch, Sale, SaleDetail } from '../types';

const SalesPanel: React.FC = () => {
  const location = useLocation();
  const [data, setData] = useState(dbService.getAllData());
  const [selectedCustomerId] = useState(''); // This was unused but present in logic
  const [activeCustomerId, setActiveCustomerId] = useState(''); // Renamed for clarity
  const [cart, setCart] = useState<{ productId: string; quantity: number; batchId: string }[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [message, setMessage] = useState('');
  
  // Date Range Filtering State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Invoice Modal State
  const [viewingInvoice, setViewingInvoice] = useState<{ sale: Sale; details: SaleDetail[] } | null>(null);

  // Return Modal State
  const [returnSale, setReturnSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{ [detailId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Producto Dañado');
  const [detailedReason, setDetailedReason] = useState('');

  // Map Modal State
  const [mapCustomer, setMapCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (location.state?.preSelectedCustomerId) {
      setActiveCustomerId(location.state.preSelectedCustomerId);
    }
  }, [location]);

  const refreshData = () => setData(dbService.getAllData());

  const handleAddToCart = (productId: string, quantity: number) => {
    const batch = dbService.getFefoBatch(productId, quantity);
    if (!batch) {
      alert("No hay stock disponible en lotes vigentes para esta cantidad.");
      return;
    }
    setCart([...cart, { productId, quantity, batchId: batch.id }]);
  };

  const handleConfirmSale = () => {
    if (!activeCustomerId || cart.length === 0) return;

    const itemsSubtotal = cart.reduce((acc, item) => {
      const p = data.products.find(prod => prod.id === item.productId)!;
      return acc + (p.salePrice * item.quantity);
    }, 0);

    const total = itemsSubtotal + deliveryFee;

    const saleId = Math.random().toString(36).substr(2, 9);
    const newSale: Sale = {
      id: saleId,
      customerId: activeCustomerId,
      sellerId: 'admin',
      date: new Date().toISOString(),
      total,
      deliveryFee,
      paymentMethod: 'Cash',
      paymentStatus: 'Pending',
      deliveryStatus: 'In Route',
    };

    const details = cart.map(item => {
      const p = data.products.find(prod => prod.id === item.productId)!;
      return {
        productId: item.productId,
        batchId: item.batchId,
        quantity: item.quantity,
        unitPrice: p.salePrice,
        subtotal: p.salePrice * item.quantity
      };
    });

    dbService.createSale(newSale, details);
    
    // Preparar datos para la factura inmediata
    const createdDetails = details.map(d => ({ ...d, id: 'temp', saleId }));
    setViewingInvoice({ sale: newSale, details: createdDetails as SaleDetail[] });

    setCart([]);
    setDeliveryFee(0);
    setActiveCustomerId('');
    refreshData();
    setMessage('¡Venta registrada con éxito!');
    setTimeout(() => setMessage(''), 3000);
  };

  const openInvoiceFromHistory = (sale: Sale) => {
    const details = data.saleDetails.filter(sd => sd.saleId === sale.id);
    setViewingInvoice({ sale, details });
  };

  const sendInvoiceWhatsApp = (sale: Sale, details: SaleDetail[]) => {
    const customer = data.customers.find(c => c.id === sale.customerId);
    if (!customer) return;

    const itemsText = details.map(d => {
      const p = data.products.find(prod => prod.id === d.productId);
      return `• ${p?.name} x ${d.quantity}: *$${d.subtotal.toLocaleString()}*`;
    }).join('\n');

    const message = encodeURIComponent(
      `❄️ *FRIGOGEST - FACTURA #${sale.id.toUpperCase()}*\n\n` +
      `Hola *${customer.businessName}*, adjuntamos el resumen de su pedido:\n\n` +
      `${itemsText}\n\n` +
      `📦 *Envío:* $${(sale.deliveryFee || 0).toLocaleString()}\n` +
      `💰 *TOTAL A PAGAR:* *$${sale.total.toLocaleString()}*\n\n` +
      `💳 *Método:* ${sale.paymentMethod === 'Cash' ? 'Efectivo' : 'Crédito'}\n` +
      `📍 *Destino:* ${customer.address}\n\n` +
      `¡Gracias por su compra!`
    );

    window.open(`https://wa.me/${customer.phone.replace(/\s+/g, '')}?text=${message}`, '_blank');
  };

  const handleMarkAsDelivered = (sale: Sale) => {
    if (!window.confirm(`¿Está seguro de marcar la orden #${sale.id.toUpperCase()} como ENTREGADA?`)) return;

    const updates: Partial<Sale> = { deliveryStatus: 'Delivered' };
    
    if (sale.paymentMethod === 'Credit') {
      const isSettled = window.confirm(
        "Esta es una venta a CRÉDITO.\n\n" +
        "¿El cliente realizó el pago de este saldo en el momento de la entrega?\n\n" +
        "• Presione ACEPTAR para marcar como PAGADA (Ajustará cartera).\n" +
        "• Presione CANCELAR para mantener como PENDIENTE (Crédito activo)."
      );
      updates.paymentStatus = isSettled ? 'Paid' : 'Pending';
    } else {
      updates.paymentStatus = 'Paid';
    }

    dbService.updateSale(sale.id, updates);
    refreshData();
    
    const statusMsg = updates.paymentStatus === 'Paid' 
      ? "Entrega confirmada y pago registrado." 
      : "Entrega confirmada. El pago sigue pendiente en cartera.";
    
    setMessage(statusMsg);
    setTimeout(() => setMessage(''), 4000);
  };

  const openReturnModal = (sale: Sale) => {
    setReturnSale(sale);
    setReturnItems({});
    setReturnReason('Producto Dañado');
    setDetailedReason('');
  };

  const handleProcessReturn = () => {
    if (!returnSale) return;
    const itemsToReturn = (Object.entries(returnItems) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([detailId, quantity]) => ({ detailId, quantity }));

    if (itemsToReturn.length === 0) {
      alert("Por favor indique las cantidades.");
      return;
    }

    const fullReason = `${returnReason}${detailedReason ? ` - ${detailedReason}` : ''}`;
    dbService.processReturn(returnSale.id, itemsToReturn, fullReason);
    setReturnSale(null);
    refreshData();
    alert("Devolución procesada.");
  };

  const filteredSales = useMemo(() => {
    return data.sales.filter(sale => {
      const saleDate = new Date(sale.date).toISOString().split('T')[0];
      const matchesStart = startDate ? saleDate >= startDate : true;
      const matchesEnd = endDate ? saleDate <= endDate : true;
      return matchesStart && matchesEnd;
    }).slice().reverse();
  }, [data.sales, startDate, endDate]);

  const saleDetailsForReturn = useMemo(() => {
    if (!returnSale) return [];
    return data.saleDetails.filter(sd => sd.saleId === returnSale.id);
  }, [returnSale, data.saleDetails]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const p = data.products.find(prod => prod.id === item.productId)!;
      return acc + (p.salePrice * item.quantity);
    }, 0);
  }, [cart, data.products]);

  const handleOpenMap = () => {
    const customer = data.customers.find(c => c.id === activeCustomerId);
    if (customer) setMapCustomer(customer);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-6 text-slate-800">Nuevo Pedido</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
              <div className="flex space-x-2">
                <select 
                  value={activeCustomerId}
                  onChange={(e) => setActiveCustomerId(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium text-slate-800"
                >
                  <option value="">Seleccione un cliente...</option>
                  {data.customers.map(c => (
                    <option key={c.id} value={c.id}>{c.businessName} - {c.address}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleOpenMap}
                  disabled={!activeCustomerId}
                  className="p-3 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed group"
                  title="Ver ubicación en el mapa"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.products.map(p => {
                const totalQty = data.batches.filter(b => b.productId === p.id).reduce((acc, b) => acc + b.currentQty, 0);
                return (
                  <div key={p.id} className="p-4 border border-slate-100 rounded-lg flex items-center justify-between hover:border-sky-200 transition-colors bg-white">
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-sky-600 font-bold">${p.salePrice.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">Stock Disp: {totalQty} {p.unit}s</p>
                    </div>
                    <div className="flex space-x-2">
                      <input 
                        id={`qty-${p.id}`} 
                        type="number" 
                        defaultValue="1" 
                        min="1" 
                        className="w-16 text-center border-slate-300 rounded-lg p-2 text-sm font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none text-slate-800" 
                      />
                      <button 
                        onClick={() => {
                          const qty = Number((document.getElementById(`qty-${p.id}`) as HTMLInputElement).value);
                          handleAddToCart(p.id, qty);
                        }}
                        className="bg-sky-500 text-white p-2 rounded-lg hover:bg-sky-600 shadow-sm active:scale-95 transition-transform"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xl flex flex-col h-full min-h-[450px]">
            <h2 className="text-lg font-bold mb-6 flex items-center text-slate-800">
              <svg className="w-5 h-5 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 118 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              Resumen de Orden
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1 custom-scrollbar">
              {cart.map((item, idx) => {
                const p = data.products.find(prod => prod.id === item.productId)!;
                return (
                  <div key={idx} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{item.quantity} x ${p.salePrice.toLocaleString()}</p>
                    </div>
                    <p className="font-bold text-sky-600 mx-2">${(item.quantity * p.salePrice).toLocaleString()}</p>
                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                );
              })}
              {cart.length === 0 && <p className="text-center text-slate-400 mt-12 italic text-sm">El carrito está vacío.</p>}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
                    Domicilio (Transporte)
                  </label>
                  <span className="text-[10px] text-sky-400 font-bold">Opcional</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sky-400 font-bold">$</span>
                  <input 
                    type="number" 
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-white border border-sky-200 rounded-xl p-2 pl-7 text-sm font-bold text-sky-700 outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1 px-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Subtotal Productos:</span>
                  <span>${cartSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Envío:</span>
                  <span>${deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-100">
                  <span className="text-slate-600">Total:</span>
                  <span className="text-sky-600">
                    ${(cartSubtotal + deliveryFee).toLocaleString()}
                  </span>
                </div>
              </div>
              
              {message && <p className="text-center text-emerald-600 font-bold text-sm bg-emerald-50 py-2 rounded-lg border border-emerald-100 animate-pulse">{message}</p>}

              <button 
                onClick={handleConfirmSale}
                disabled={cart.length === 0 || !activeCustomerId}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black disabled:opacity-50 transition-all transform active:scale-95 shadow-lg shadow-slate-200"
              >
                Confirmar y Facturar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <svg className="w-6 h-6 mr-2 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Historial de Ventas
          </h2>
          
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase ml-1">Desde</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none px-1"
              />
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase ml-1">Hasta</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none px-1"
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                title="Limpiar Filtros"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Orden</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map(sale => {
                const customer = data.customers.find(c => c.id === sale.customerId);
                const saleDetails = data.saleDetails.filter(sd => sd.saleId === sale.id);
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-700 text-sm">#{sale.id.toUpperCase()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(sale.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800 text-sm">{customer?.businessName}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-slate-900">${sale.total.toLocaleString()}</p>
                      {sale.deliveryFee && sale.deliveryFee > 0 && (
                        <p className="text-[8px] text-sky-500 font-bold uppercase">Incluye Domicilio</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                        sale.deliveryStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                        sale.deliveryStatus === 'Returned' ? 'bg-red-100 text-red-700' :
                        'bg-sky-100 text-sky-700'
                      }`}>
                        {sale.deliveryStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => sendInvoiceWhatsApp(sale, saleDetails)}
                          className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Enviar por WhatsApp"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </button>
                        <button 
                          onClick={() => openInvoiceFromHistory(sale)}
                          className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                          title="Ver Factura"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </button>
                        {sale.deliveryStatus !== 'Delivered' && (
                          <button 
                            onClick={() => handleMarkAsDelivered(sale)}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all"
                          >
                            Entregar
                          </button>
                        )}
                        <button 
                          onClick={() => openReturnModal(sale)}
                          className="bg-white border border-slate-200 text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg font-bold text-xs transition-all"
                        >
                          Devolver
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No se encontraron ventas en este rango de fechas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in duration-300">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700">Comprobante de Venta</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={() => sendInvoiceWhatsApp(viewingInvoice.sale, viewingInvoice.details)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-all flex items-center shadow-lg shadow-emerald-100"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Enviar WhatsApp
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-700 transition-all flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                  Imprimir
                </button>
                <button 
                  onClick={() => setViewingInvoice(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8" id="invoice-printable">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-black text-sky-600 tracking-tighter">FrigoGest</h1>
                  <p className="text-xs text-slate-500 font-bold uppercase mt-1">Distribuidora de Alimentos Congelados</p>
                  <p className="text-[10px] text-slate-400 mt-2">NIT: 900.123.456-7 • Barranquilla, Colombia</p>
                  <p className="text-[10px] text-slate-400">Tel: +57 300 000 0000</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-slate-800">FACTURA</h2>
                  <p className="text-sky-600 font-black text-lg">#{viewingInvoice.sale.id.toUpperCase()}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(viewingInvoice.sale.date).toLocaleDateString()} • {new Date(viewingInvoice.sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10 border-y border-slate-100 py-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Facturado a:</p>
                  {(() => {
                    const cust = data.customers.find(c => c.id === viewingInvoice.sale.customerId);
                    return (
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-lg leading-tight">{cust?.businessName}</p>
                        <p className="text-sm text-slate-600">{cust?.address}</p>
                        <p className="text-xs text-slate-500">{cust?.city} • {cust?.phone}</p>
                      </div>
                    );
                  })()}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detalles de Pago:</p>
                  <p className="text-sm font-bold text-slate-800">{viewingInvoice.sale.paymentMethod === 'Cash' ? 'Efectivo' : viewingInvoice.sale.paymentMethod === 'Credit' ? 'Crédito' : 'Transferencia'}</p>
                  <p className={`text-xs font-bold uppercase mt-1 ${viewingInvoice.sale.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Estado: {viewingInvoice.sale.paymentStatus === 'Paid' ? 'Pagada' : 'Pendiente'}
                  </p>
                </div>
              </div>

              <table className="w-full mb-10">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="pb-3">Descripción</th>
                    <th className="pb-3 text-center">Cant.</th>
                    <th className="pb-3 text-right">Precio Unit.</th>
                    <th className="pb-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingInvoice.details.map((detail, idx) => {
                    const prod = data.products.find(p => p.id === detail.productId);
                    return (
                      <tr key={idx} className="text-sm">
                        <td className="py-4">
                          <p className="font-bold text-slate-800">{prod?.name}</p>
                          <p className="text-[9px] text-slate-400">Lote: {detail.batchId}</p>
                        </td>
                        <td className="py-4 text-center font-medium text-slate-600">{detail.quantity}</td>
                        <td className="py-4 text-right text-slate-600">${detail.unitPrice.toLocaleString()}</td>
                        <td className="py-4 text-right font-bold text-slate-800">${detail.subtotal.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal Productos</span>
                    <span>${(viewingInvoice.sale.total - (viewingInvoice.sale.deliveryFee || 0)).toLocaleString()}</span>
                  </div>
                  {viewingInvoice.sale.deliveryFee && viewingInvoice.sale.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm text-sky-600 font-bold">
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
                        Domicilio
                      </span>
                      <span>${viewingInvoice.sale.deliveryFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>IVA (0%)</span>
                    <span>$0</span>
                  </div>
                  <div className="flex justify-between text-xl font-black text-slate-900 pt-3 border-t border-slate-200">
                    <span>TOTAL</span>
                    <span className="text-sky-600">${viewingInvoice.sale.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-8 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-medium">Gracias por confiar en FrigoGest. Conserve este comprobante para su registro.</p>
                <div className="flex justify-center space-x-8 mt-6">
                  <div className="w-32 border-t border-slate-300 pt-1">
                    <p className="text-[8px] uppercase font-bold text-slate-400">Firma Autorizada</p>
                  </div>
                  <div className="w-32 border-t border-slate-300 pt-1">
                    <p className="text-[8px] uppercase font-bold text-slate-400">Recibido Conforme</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {mapCustomer && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-3xl w-full p-6 sm:p-8 animate-in zoom-in duration-300 border border-slate-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 leading-tight">{mapCustomer.businessName}</h3>
                <div className="flex items-center text-slate-500 mt-1">
                  <svg className="w-4 h-4 mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                  <p className="font-medium text-sm sm:text-base">{mapCustomer.address}</p>
                </div>
              </div>
              <button 
                onClick={() => setMapCustomer(null)} 
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-500 hover:text-slate-800 shadow-sm active:scale-95"
                title="Cerrar Mapa"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="aspect-video w-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-inner relative group">
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${mapCustomer.coordinates.lat},${mapCustomer.coordinates.lng}&z=16&output=embed`}
                allowFullScreen
                title={`Mapa de ${mapCustomer.businessName}`}
              ></iframe>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400 font-medium italic">
                Ubicación registrada para logística y entrega. Use los controles del mapa para navegar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-bold mb-2 text-slate-800">Registrar Devolución</h3>
            <p className="text-sm text-slate-500 mb-6">Venta: <span className="font-bold">#{returnSale.id.toUpperCase()}</span></p>

            <div className="space-y-4 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {saleDetailsForReturn.map(detail => (
                <div key={detail.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-slate-800">
                  <p className="font-bold text-sm">{data.products.find(p => p.id === detail.productId)?.name}</p>
                  <input 
                    type="number" min="0" max={detail.quantity}
                    value={returnItems[detail.id] || 0}
                    onChange={(e) => setReturnItems({...returnItems, [detail.id]: Math.min(detail.quantity, Math.max(0, parseInt(e.target.value) || 0))})}
                    className="w-16 border border-slate-300 rounded-lg p-2 text-center text-sm font-bold bg-white"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <select 
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 text-slate-800 font-medium"
              >
                <option>Producto Dañado</option>
                <option>Cadena de Frío Rota</option>
                <option>Pedido Erróneo</option>
              </select>
              <textarea 
                value={detailedReason}
                onChange={(e) => setDetailedReason(e.target.value)}
                placeholder="Detalles..."
                className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 h-12 text-slate-800"
              />
            </div>

            <div className="flex space-x-4">
              <button onClick={() => setReturnSale(null)} className="flex-1 p-4 border border-slate-200 rounded-2xl font-bold text-slate-600">Cancelar</button>
              <button onClick={handleProcessReturn} className="flex-1 p-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPanel;
