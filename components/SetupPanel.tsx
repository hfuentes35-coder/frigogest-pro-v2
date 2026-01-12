
import React, { useState, useEffect } from 'react';
import { syncService } from '../services/sync';

const SetupPanel: React.FC = () => {
  const [cloudId, setCloudId] = useState(syncService.getLinkedId() || '');
  const [newId, setNewId] = useState('');
  const [isInstalled, setIsInstalled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }
  }, []);

  const handleLink = () => {
    if (newId.length < 4) return;
    syncService.linkDevice(newId.toUpperCase());
    setCloudId(newId.toUpperCase());
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('success');
      window.location.reload(); // Recargar para activar el bucle de sync
    }, 2000);
  };

  const handleGenerate = () => {
    const id = syncService.generateCloudId();
    setNewId(id);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 lg:py-16 px-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Columna 1: Instalación PWA */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-4">Instalación Nativa</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Convierte FrigoGest en una aplicación de escritorio o móvil para trabajar 100% offline y con mayor velocidad.
            </p>
            {isInstalled ? (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center font-bold text-sm">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                Ya estás usando la versión nativa
              </div>
            ) : (
              <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-black transition-all">
                Descargar Instalador
              </button>
            )}
          </div>
        </div>

        {/* Columna 2: Sincronización Real-Time */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
               <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-2V7h-2v4h-2V7h-2v4H9V7H7v4H5v2h2v4h2v-4h2v4h2v-4h2v4h2v-4h2v-2z"></path></svg>
            </div>
            
            <h3 className="text-2xl font-black mb-2 flex items-center">
              Sincronización Cloud
              <span className="ml-3 w-2 h-2 bg-sky-400 rounded-full animate-pulse"></span>
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Vincula tu PC y Celular</p>

            <div className="space-y-6 relative z-10">
              {cloudId ? (
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl text-center">
                  <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block mb-2">ID DE EMPRESA ACTIVO</span>
                  <p className="text-4xl font-black tracking-[0.3em] text-white">{cloudId}</p>
                  <button 
                    onClick={() => { localStorage.removeItem('frigogest_linked_id'); setCloudId(''); }}
                    className="mt-6 text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                  >
                    [ Desvincular Dispositivo ]
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-2">Código de Vinculación</label>
                    <div className="flex space-x-2">
                      <input 
                        value={newId}
                        onChange={(e) => setNewId(e.target.value.toUpperCase())}
                        maxLength={6}
                        placeholder="EX: A1B2C3"
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-center font-black text-xl tracking-[0.2em] focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                      <button 
                        onClick={handleGenerate}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
                        title="Generar Nuevo ID"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={handleLink}
                    disabled={newId.length < 4}
                    className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-30 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center"
                  >
                    {syncStatus === 'syncing' ? (
                      <svg className="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24"></svg>
                    ) : 'Sincronizar Dispositivos'}
                  </button>
                  <p className="text-[9px] text-slate-500 font-medium text-center px-4">
                    Al vincular, todos los dispositivos compartirán el mismo stock, clientes y facturación en tiempo real.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SetupPanel;
