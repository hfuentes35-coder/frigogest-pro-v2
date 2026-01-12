
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbService, DB_KEYS } from '../services/db';
import { Customer } from '../types';

const CustomersPanel: React.FC = () => {
  const [data, setData] = useState(dbService.getAllData());
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [mapCustomer, setMapCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();

  const refreshData = () => setData(dbService.getAllData());

  const handleAddCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerData = {
      businessName: formData.get('businessName') as string,
      contactPerson: formData.get('contactPerson') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      coordinates: { 
        lat: Number(formData.get('lat')) || 10.963, 
        lng: Number(formData.get('lng')) || -74.796 
      },
      creditLimit: Number(formData.get('creditLimit')),
      visitDay: Number(formData.get('visitDay')),
    };

    const customers = dbService.get<Customer>(DB_KEYS.CUSTOMERS);
    
    if (editingCustomer) {
      const updated = customers.map(c => c.id === editingCustomer.id ? { ...editingCustomer, ...customerData } : c);
      dbService.save(DB_KEYS.CUSTOMERS, updated);
      setEditingCustomer(null);
    } else {
      const newCustomer: Customer = {
        ...customerData,
        id: Math.random().toString(36).substr(2, 9),
        currentBalance: 0,
      };
      dbService.save(DB_KEYS.CUSTOMERS, [...customers, newCustomer]);
    }

    setIsAdding(false);
    refreshData();
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (window.confirm(`¿Está seguro de eliminar a "${name}"? Esta acción eliminará el registro del cliente pero no sus ventas pasadas.`)) {
      dbService.deleteCustomer(id);
      refreshData();
    }
  };

  const handleStartBilling = (customerId: string) => {
    navigate('/sales', { state: { preSelectedCustomerId: customerId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Directorio de Clientes</h2>
          <p className="text-sm text-slate-500">Gestión de cartera y rutas de distribución.</p>
        </div>
        <button 
          onClick={() => { setEditingCustomer(null); setIsAdding(true); }}
          className="bg-sky-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Registrar Cliente
        </button>
      </div>

      {(isAdding || editingCustomer) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800">
              {editingCustomer ? 'Editar Cliente' : 'Alta de Nuevo Cliente'}
            </h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Nombre Comercial</label>
                  <input name="businessName" defaultValue={editingCustomer?.businessName} required placeholder="Ej: Supermercado El Éxito" className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Contacto Directo</label>
                  <input name="contactPerson" defaultValue={editingCustomer?.contactPerson} required placeholder="Nombre" className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Teléfono</label>
                  <input name="phone" defaultValue={editingCustomer?.phone} required placeholder="300 000 0000" className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Dirección de Entrega</label>
                  <input name="address" defaultValue={editingCustomer?.address} required placeholder="Calle, Carrera, Número" className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Día de Visita</label>
                  <select name="visitDay" defaultValue={editingCustomer?.visitDay || 1} required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium">
                    <option value="1">Lunes</option>
                    <option value="2">Martes</option>
                    <option value="3">Miércoles</option>
                    <option value="4">Jueves</option>
                    <option value="5">Viernes</option>
                    <option value="6">Sábado</option>
                    <option value="7">Domingo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Cupo Crédito</label>
                  <input name="creditLimit" type="number" defaultValue={editingCustomer?.creditLimit || 500000} required className="w-full border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-sky-500 outline-none font-medium" />
                </div>
              </div>
              <div className="flex space-x-3 pt-6">
                <button type="button" onClick={() => { setIsAdding(false); setEditingCustomer(null); }} className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all active:scale-95">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-400 uppercase text-[10px] font-black tracking-widest">
                <th className="px-6 py-4">Información del Negocio</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4 text-center">Ruta / Día</th>
                <th className="px-6 py-4 text-right">Saldo Actual</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center font-bold text-lg">
                        {c.businessName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{c.businessName}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{c.contactPerson} • {c.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      <span className="truncate max-w-[150px]">{c.address}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                      {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'][c.visitDay]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-black text-slate-900">${c.currentBalance.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Cupo: ${c.creditLimit.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center space-x-1.5">
                      <button 
                        onClick={() => handleStartBilling(c.id)}
                        className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-xl transition-all font-bold text-xs shadow-sm active:scale-95 border border-emerald-100"
                        title="Nueva Factura"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2-2v14a2 2 0 002 2z"></path></svg>
                        <span>Facturar</span>
                      </button>
                      
                      <button 
                        onClick={() => setEditingCustomer(c)}
                        className="flex items-center space-x-1 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white px-3 py-1.5 rounded-xl transition-all border border-sky-100 active:scale-95 font-bold text-xs shadow-sm"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        <span>Editar</span>
                      </button>

                      <button 
                        onClick={() => setMapCustomer(c)}
                        className="flex items-center space-x-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-xl transition-all border border-indigo-100 active:scale-95 font-bold text-xs shadow-sm"
                        title="Ver en Mapa"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span>Ver en Mapa</span>
                      </button>

                      <button 
                        onClick={() => handleDeleteCustomer(c.id, c.businessName)}
                        className="bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 p-2 rounded-xl transition-all border border-slate-100 hover:border-red-100 active:scale-95"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <p className="italic">No hay clientes registrados aún.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Map Modal */}
      {mapCustomer && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all animate-in fade-in duration-300">
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
    </div>
  );
};

export default CustomersPanel;
