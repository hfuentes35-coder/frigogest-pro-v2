
import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { getSmartInventoryInsights } from '../services/gemini';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COLORS } from '../constants';
import { Sale } from '../types';
import * as XLSX from 'xlsx';

const Dashboard: React.FC = () => {
  const [data, setData] = useState(dbService.getAllData());
  const [insights, setInsights] = useState<string>('Consultando a la IA...');
  const [loadingInsights, setLoadingInsights] = useState(true);

  const refreshData = () => setData(dbService.getAllData());

  useEffect(() => {
    const fetchInsights = async () => {
      const res = await getSmartInventoryInsights();
      setInsights(res || "Error al obtener insights.");
      setLoadingInsights(false);
    };
    fetchInsights();

    // Listener para actualizaciones desde la nube
    window.addEventListener('db-updated', refreshData);
    return () => window.removeEventListener('db-updated', refreshData);
  }, []);

  const totalSales = data.sales.reduce((acc, s) => acc + s.total, 0);
  const pendingCollections = data.customers.reduce((acc, c) => acc + c.currentBalance, 0);
  const lowStockProducts = data.products.filter(p => {
    const totalQty = data.batches.filter(b => b.productId === p.id).reduce((acc, b) => acc + b.currentQty, 0);
    return totalQty < p.minStock;
  });

  const expiringSoon = data.batches.filter(b => {
    const diff = new Date(b.expiryDate).getTime() - new Date().getTime();
    return diff > 0 && diff < (15 * 24 * 60 * 60 * 1000);
  });

  const chartData = data.products.map(p => ({
    name: p.name.substring(0, 8),
    stock: data.batches.filter(b => b.productId === p.id).reduce((acc, b) => acc + b.currentQty, 0),
  }));

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-gradient-to-r from-sky-600 to-indigo-700 p-6 lg:p-8 rounded-[2rem] text-white shadow-2xl shadow-sky-200 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight mb-2">Cloud Real-Time Activo</h2>
            <p className="text-sky-100 text-sm font-medium opacity-80 max-w-md">
              Tus datos están sincronizados. Los cambios realizados en dispositivos móviles por tus vendedores se reflejan aquí cada pocos segundos.
            </p>
          </div>
          <div className="flex -space-x-3">
             <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center text-[10px] font-black">PC</div>
             <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center text-[10px] font-black">CEL</div>
             <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-sky-400 flex items-center justify-center text-[10px] font-black shadow-lg">IA</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard title="Ventas Hoy" value={`$${totalSales.toLocaleString()}`} icon="💰" color="text-emerald-500" bgColor="bg-emerald-50" />
        <StatCard title="Por Cobrar" value={`$${pendingCollections.toLocaleString()}`} icon="💳" color="text-amber-500" bgColor="bg-amber-50" />
        <StatCard title="Stock Bajo" value={lowStockProducts.length.toString()} icon="⚠️" color="text-red-500" bgColor="bg-red-50" />
        <StatCard title="Vencimientos" value={expiringSoon.length.toString()} icon="❄️" color="text-sky-500" bgColor="bg-sky-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
        <div className="lg:col-span-2 bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest text-xs">Monitoreo de Stock</h3>
            <button className="text-[10px] font-black text-sky-600 uppercase bg-sky-50 px-3 py-1 rounded-full" onClick={refreshData}>Refrescar</button>
          </div>
          <div className="h-64 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 700 }}
                />
                <Bar dataKey="stock" radius={[6, 6, 0, 0]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.stock < 20 ? '#ef4444' : '#0ea5e9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full -mr-16 -mb-16 blur-2xl"></div>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-sky-500 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h3 className="font-black text-sm uppercase tracking-widest">IA Smart Assistant</h3>
          </div>
          {loadingInsights ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-10 opacity-50">
              <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] uppercase tracking-widest font-black text-sky-200">Analizando nube de datos...</p>
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-slate-300 font-medium overflow-y-auto max-h-80 pr-2 custom-scrollbar">
              {insights}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string; bgColor: string }> = ({ title, value, icon, color, bgColor }) => (
  <div className="bg-white p-5 lg:p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group active:scale-95 lg:active:scale-100">
    <div className="flex flex-col gap-3">
      <div className={`${bgColor} ${color} w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-xl lg:text-2xl shadow-inner group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] lg:text-xs text-slate-400 font-black uppercase tracking-widest">{title}</p>
        <h4 className="text-lg lg:text-2xl font-black text-slate-800 mt-1 truncate">{value}</h4>
      </div>
    </div>
  </div>
);

export default Dashboard;
