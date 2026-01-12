
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { optimizeRoute } from '../services/gemini';
import { Customer } from '../types';

const RouteOptimizer: React.FC = () => {
  const [data, setData] = useState(dbService.getAllData());
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 7);
  const [currentPos, setCurrentPos] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    setData(dbService.getAllData());
    // Intentar obtener ubicación actual para el GPS
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCurrentPos({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }, (err) => console.log("Geolocalización desactivada"));
    }
  }, []);

  const customersToVisit = data.customers.filter(c => c.visitDay === selectedDay);

  const handleOptimize = async () => {
    if (customersToVisit.length === 0) return;
    
    setLoading(true);
    setResult('');
    
    try {
      const res = await optimizeRoute(customersToVisit);
      setResult(res);
    } catch (error) {
      setResult("Error al conectar con el servicio de IA. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = (customer: Customer) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${customer.coordinates.lat},${customer.coordinates.lng}`;
    window.open(url, '_blank');
  };

  const openFullRouteInMaps = () => {
    if (customersToVisit.length === 0) return;
    
    // El origen es la ubicación actual o el centro de Barranquilla por defecto
    const origin = currentPos ? `${currentPos.lat},${currentPos.lng}` : "10.963,-74.796";
    const destination = `${customersToVisit[customersToVisit.length - 1].coordinates.lat},${customersToVisit[customersToVisit.length - 1].coordinates.lng}`;
    
    // Los waypoints son los puntos intermedios
    const waypoints = customersToVisit
      .slice(0, -1)
      .map(c => `${c.coordinates.lat},${c.coordinates.lng}`)
      .join('|');

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const days = [
    { id: 1, name: 'Lun' }, { id: 2, name: 'Mar' }, { id: 3, name: 'Mié' },
    { id: 4, name: 'Jue' }, { id: 5, name: 'Vie' }, { id: 6, name: 'Sáb' }, { id: 7, name: 'Dom' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            Logística Inteligente
            {currentPos && (
              <span className="ml-3 flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                GPS Activo
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500">Optimización de rutas y navegación satelital.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => { setSelectedDay(day.id); setResult(''); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedDay === day.id 
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-100' 
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {day.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center text-sm">
                <svg className="w-5 h-5 mr-2 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                Plan de Entrega
              </h3>
              <div className="flex space-x-2">
                 <button 
                  onClick={openFullRouteInMaps}
                  disabled={customersToVisit.length === 0}
                  className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                 >
                   Abrir Mapa Completo
                 </button>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {customersToVisit.map((c, idx) => (
                <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold mr-3">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{c.businessName}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{c.address}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => openInGoogleMaps(c)}
                      className="p-2 bg-white text-emerald-500 rounded-lg border border-slate-200 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                      title="Navegar con GPS"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
              {customersToVisit.length === 0 && (
                 <div className="py-12 text-center">
                   <p className="text-slate-400 text-sm italic">Seleccione un día con despachos.</p>
                 </div>
              )}
            </div>
          </div>

          <button 
            onClick={handleOptimize}
            disabled={loading || customersToVisit.length === 0}
            className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center transition-all shadow-xl transform active:scale-95 ${
              customersToVisit.length === 0 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sky-100 hover:shadow-sky-200'
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full" /> 
                Calculando Ruta Óptima...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Generar Ruta con Navegación GPS
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-900 text-slate-100 p-8 rounded-3xl shadow-2xl flex flex-col min-h-[500px] border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-emerald-500 to-indigo-500"></div>
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center text-sky-400 uppercase tracking-widest text-xs">
              <span className="w-2 h-2 bg-sky-500 rounded-full mr-2 animate-pulse"></span>
              Hoja de Ruta Digital
            </h3>
            {result && (
              <div className="flex space-x-3">
                <button 
                  onClick={openFullRouteInMaps}
                  className="text-[10px] font-bold text-emerald-400 hover:text-white transition-colors flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A2 2 0 013 15.483V6a2 2 0 011.236-1.841l7-3a2 2 0 011.528 0l7 3A2 2 0 0121 6v9.483a2 2 0 01-1.236 1.841L15 20m-3-3v3m0-3l-3-1.5m3 1.5l3-1.5M9 10l3 1.5L15 10m-3-3v3"></path></svg>
                  [ INICIAR GPS ]
                </button>
                <button onClick={() => window.print()} className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors">
                  [ IMPRIMIR ]
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 font-mono text-xs leading-relaxed overflow-y-auto pr-2 custom-scrollbar whitespace-pre-wrap">
            {result ? (
              <div className="animate-in fade-in slide-in-from-top-2 duration-500 text-slate-300">
                {result}
              </div>
            ) : loading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Geolocalizando paradas...</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-12 space-y-6">
                <div className="relative">
                  <svg className="w-20 h-20 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">!</div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400">Genere la ruta para activar el GPS multi-parada</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between italic">
            <span>Lat: {currentPos?.lat?.toFixed(4) || '--'} Lng: {currentPos?.lng?.toFixed(4) || '--'}</span>
            <span>Rastreo Satelital Activo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizer;
