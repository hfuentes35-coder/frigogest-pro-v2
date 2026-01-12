
import { GoogleGenAI, Type } from "@google/genai";
import { dbService } from "./db";

export const getSmartInventoryInsights = async () => {
  if (!navigator.onLine) {
    return "💡 Nota: Estás en modo offline. El análisis de IA requiere conexión a internet para procesar tus datos actuales.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const data = dbService.getAllData();

  const prompt = `
    Analiza los siguientes datos de inventario y clientes de mi distribuidora de congelados:
    PRODUCTOS: ${JSON.stringify(data.products)}
    LOTES: ${JSON.stringify(data.batches)}
    CLIENTES: ${JSON.stringify(data.customers)}
    
    Proporciona un resumen ejecutivo en español sobre:
    1. Lotes críticos por vencer (menos de 15 días).
    2. Productos con stock por debajo del mínimo.
    3. Una recomendación estratégica de venta para el día de hoy basada en los lotes que vencen pronto.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "No se pudo generar el análisis en este momento.";
  }
};

export const optimizeRoute = async (customers: any[]) => {
  if (!navigator.onLine) {
    return "📍 Modo Offline: La optimización por IA no está disponible sin conexión. Se recomienda seguir el orden alfabético o de dirección manual.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const customersData = customers.map((c, index) => ({
    id: index + 1,
    nombre: c.businessName,
    direccion: c.address,
    lat: c.coordinates.lat,
    lng: c.coordinates.lng
  }));

  const prompt = `
    Eres un experto en logística y navegación GPS para alimentos congelados en Barranquilla.
    
    PUNTO DE PARTIDA SUGERIDO: Centro de Distribución (Barranquilla, Centro).
    
    LISTA DE CLIENTES A VISITAR:
    ${JSON.stringify(customersData)}
    
    TAREA:
    1. Define la secuencia EXACTA de entrega (1, 2, 3...) optimizando el ahorro de combustible y tiempo.
    2. Explica la lógica de navegación (ej: "Iniciamos en el norte para bajar por la Cra 43 evitando el tráfico del mediodía").
    3. Para cada parada, menciona un detalle logístico (ej: "Punto de alta congestión" o "Fácil acceso para descarga").
    4. Estimación de tiempo total de la ruta.
    
    IMPORTANTE: El tono debe ser profesional y directo para un conductor. Presenta la información como una bitácora de navegación.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Route Error:", error);
    return "Ruta secuencial estándar recomendada. Inicie navegación manual punto a punto.";
  }
};
