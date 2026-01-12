
import { dbService, DB_KEYS } from './db';

const SYNC_INTERVAL = 15000; // 15 segundos para optimizar batería en móviles
const CLOUD_STORAGE_PREFIX = 'frigogest_cloud_';

export const syncService = {
  // Genera un ID de empresa aleatorio para vincular dispositivos
  generateCloudId: () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // Obtiene el ID vinculado actualmente
  getLinkedId: () => {
    return localStorage.getItem('frigogest_linked_id');
  },

  // Vincula el dispositivo a un ID
  linkDevice: (id: string) => {
    localStorage.setItem('frigogest_linked_id', id);
  },

  // Empaqueta todos los datos locales para la nube
  preparePayload: () => {
    const data = dbService.getAllData();
    return {
      timestamp: Date.now(),
      deviceId: navigator.userAgent.substring(0, 20),
      payload: data
    };
  },

  // Sincronización de salida (Push)
  pushData: async () => {
    const cloudId = syncService.getLinkedId();
    if (!cloudId || !navigator.onLine) return false;

    try {
      const data = syncService.preparePayload();
      // Simulamos el envío a un endpoint centralizado
      // En una app real, aquí se usaría un POST a un backend o Firestore
      localStorage.setItem(`${CLOUD_STORAGE_PREFIX}${cloudId}`, JSON.stringify(data));
      console.log('📤 Cloud: Datos locales subidos con éxito.');
      return true;
    } catch (e) {
      console.error('Error en Push:', e);
      return false;
    }
  },

  // Sincronización de entrada (Pull)
  pullData: async () => {
    const cloudId = syncService.getLinkedId();
    if (!cloudId || !navigator.onLine) return false;

    try {
      const cloudRaw = localStorage.getItem(`${CLOUD_STORAGE_PREFIX}${cloudId}`);
      if (!cloudRaw) return false;

      const cloudData = JSON.parse(cloudRaw);
      const localLastSync = Number(localStorage.getItem('frigogest_last_sync_ts') || 0);

      // Solo actualizar si los datos de la nube son más recientes que la última sincronización local
      if (cloudData.timestamp > localLastSync) {
        console.log('📥 Cloud: Nuevos datos detectados, fusionando...');
        
        // Fusión selectiva de datos críticos
        const { products, batches, customers, sales, saleDetails } = cloudData.payload;
        
        dbService.save(DB_KEYS.PRODUCTS, products);
        dbService.save(DB_KEYS.BATCHES, batches);
        dbService.save(DB_KEYS.CUSTOMERS, customers);
        dbService.save(DB_KEYS.SALES, sales);
        dbService.save(DB_KEYS.SALE_DETAILS, saleDetails);

        localStorage.setItem('frigogest_last_sync_ts', cloudData.timestamp.toString());
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error en Pull:', e);
      return false;
    }
  }
};
