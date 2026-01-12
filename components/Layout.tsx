
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ICONS } from '../constants';
import { syncService } from '../services/sync';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [cloudId, setCloudId] = useState(syncService.getLinkedId());

  // Efecto de Red y Sincronización Automática
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Bucle de Sincronización Real-Time
    const syncInterval = setInterval(async () => {
      if (navigator.onLine && syncService.getLinkedId()) {
        setIsSyncing(true);
        // Intentar Pull y luego Push para mantener todo al día
        const pulled = await syncService.pullData();
        const pushed = await syncService.pushData();
        
        if (pulled) {
          // Si hubo cambios desde la nube, refrescar la vista forzando un re-render
          window.dispatchEvent(new CustomEvent('db-updated'));
        }
        
        setTimeout(() => setIsSyncing(false), 2000);
      }
    }, 15000);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  const navItems = [
    { name: 'Inicio', path: '/', icon: ICONS.Dashboard },
    { name: 'Stock', path: '/inventory', icon: ICONS.Inventory },
    { name: 'Ventas', path: '/sales', icon: ICONS.Sales },
    { name: 'Rutas', path: '/routes', icon: ICONS.Delivery },
    { name: 'Clientes', path: '/customers', icon: ICONS.Customers },
    { name: 'Cloud Sync', path: '/setup', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Banner de estado offline */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-1.5 flex items-center justify-center space-x-2 animate-in slide-in-from-top duration-300">
          <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 4.978 4.978 0 011.414-3.536m0 0L4.243 4.243M9 9a3 3 0 013 3"></path>
          </svg>
          <span className="text-[10px] font-black uppercase tracking-widest">Modo Local Activo: Los datos se sincronizarán al recuperar red</span>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className={`w-72 bg-slate-900 text-white flex flex-col hidden lg:flex border-r border-slate-800 transition-all ${!isOnline ? 'pt-8' : ''}`}>
        <div className="p-8 flex items-center space-x-3">
          <div className="bg-gradient-to-br from-sky-400 to-sky-600 p-2.5 rounded-2xl shadow-lg shadow-sky-500/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
            </svg>
          </div>
          <div>
            <span className="text-2xl font-black tracking-tighter block leading-none">FrigoGest</span>
            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-[0.2em]">Enterprise</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-4 p-4 rounded-2xl transition-all duration-300 ${
                  isActive 
                  ? 'bg-sky-600 text-white shadow-xl shadow-sky-900/40 translate-x-2' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className={`${location.pathname === item.path ? 'scale-110' : ''} transition-transform`}>
                {item.icon}
              </span>
              <span className="font-bold text-sm tracking-tight">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {cloudId && (
          <div className="m-4 p-4 bg-slate-800/50 border border-slate-700 rounded-3xl text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Empresa Vinculada</p>
            <p className="text-lg font-black text-sky-400 tracking-widest">{cloudId}</p>
          </div>
        )}

        <div className="p-6 m-4 bg-slate-800/50 rounded-3xl border border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="relative">
               <img src="https://picsum.photos/48/48?random=9" className="w-12 h-12 rounded-2xl border-2 border-slate-700" alt="user" />
               <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 ${isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
            </div>
            <div>
              <p className="text-xs font-black text-white">Central Admin</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{isSyncing ? 'Sincronizando...' : 'Online'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className={`h-20 lg:h-24 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-6 lg:px-12 z-20 safe-padding-top transition-all ${!isOnline ? 'mt-8' : ''}`}>
          <div className="flex items-center lg:hidden">
             <div className="bg-sky-600 p-2 rounded-xl mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                </svg>
             </div>
             <h1 className="text-lg font-black text-slate-900 tracking-tighter">FrigoGest</h1>
          </div>
          
          <h2 className="hidden lg:block text-xl font-black text-slate-800 tracking-tight">
            {navItems.find(n => n.path === location.pathname)?.name || 'Panel Control'}
          </h2>

          <div className="flex items-center space-x-3">
            <div className={`flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              isSyncing ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <svg className={`w-3 h-3 mr-2 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {isSyncing ? 'Sincronizando' : cloudId ? 'Cloud Link Activo' : 'Solo Local'}
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto bg-slate-50 custom-scrollbar p-5 lg:p-12 pb-32 lg:pb-12 transition-all`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-200 px-6 pt-3 pb-8 flex justify-between items-center z-50 safe-padding-bottom">
        {navItems.filter(i => i.name !== 'Cloud Sync').map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center transition-all duration-300 ${isActive ? 'text-sky-600 -translate-y-1' : 'text-slate-400'}`
              }
            >
              <div className={`p-2 rounded-xl ${location.pathname === item.path ? 'bg-sky-50 shadow-inner' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest mt-1.5">{item.name}</span>
            </NavLink>
        ))}
        {/* Acceso rápido a Sync en móvil */}
        <NavLink to="/setup" className="flex flex-col items-center text-slate-400">
           <div className={`p-2 rounded-xl ${location.pathname === '/setup' ? 'bg-sky-50 text-sky-600' : ''}`}>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
           </div>
           <span className="text-[9px] font-black uppercase tracking-widest mt-1.5">Nube</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default Layout;
