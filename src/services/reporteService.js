const bolsonRepository = require('../repositories/bolsonRepository');
const despachoRepository = require('../repositories/despachoRepository');
const nfuRepository = require('../repositories/nfuRepository');
const diasHabilesRepository = require('../repositories/diasHabilesRepository');
const { ventanaMesOperativo, formatMySQLLocal, parseLocalDate } = require('../utils/fecha');

// PRODUCCIÓN diaria (sumatoria por producto)
const obtenerSumatoriaPorProducto = async (fecha /* 'YYYY-MM-DD' */) => {
  const bolsones = await bolsonRepository.obtenerTodosBolsonesPorFecha(fecha);
  const suma = {};
  for (const b of bolsones){
    const productoId = b.producto;
    if (!suma[productoId]){
      suma[productoId] = {
        productoId,
        nombre: b.nombreProducto || `Producto ID ${productoId}`,
        cantidadBolsones: 0,
        pesoTotal: 0
      };
    }
    suma[productoId].cantidadBolsones += 1;
    suma[productoId].pesoTotal += Number(b.peso || 0);
  }
  return Object.values(suma).sort((a,b)=> a.nombre.localeCompare(b.nombre));
};

// DESPACHOS diarios (sumatoria por producto)
const obtenerDespachosPorProducto = async (fecha /* 'YYYY-MM-DD' */) => {
  const filas = await despachoRepository.obtenerDespachosPorProducto(fecha);
  return filas.map(r => ({
    productoId: r.productoId,
    nombre: r.nombreProducto || `Producto ID ${r.productoId}`,
    cantidadBolsones: Number(r.cantidadBolsones || 0),
    pesoTotal: Number(r.pesoTotal || 0)
  }));
};

// STOCK ACUMULADO HISTÓRICO HASTA FECHA (NO del mes)
const obtenerStockAcumuladoHastaFecha = async (fecha /* 'YYYY-MM-DD' */) => {
  const bolsones = await bolsonRepository.obtenerBolsonesHastaFecha(fecha);
  const suma = {};
  for (const b of bolsones){
    if (Number(b.despachado) === 1) continue; // sólo no despachados
    const productoId = b.producto;
    if (!suma[productoId]){
      suma[productoId] = { productoId, nombre: b.nombreProducto || `Producto ID ${productoId}`, cantidadBolsones: 0, pesoTotal: 0 };
    }
    suma[productoId].cantidadBolsones += 1;
    suma[productoId].pesoTotal += Number(b.peso || 0);
  }
  return { productos: Object.values(suma) };
};

// STOCK del MES OPERATIVO (producidos en el mes y NO despachados)
const obtenerStockAcumuladoDelMes = async (fecha /* 'YYYY-MM-DD' */) => {
  const { inicio, fin } = ventanaMesOperativo(fecha);
  console.log('[RANGO MES OPERATIVO STOCK]', formatMySQLLocal(inicio), '->', formatMySQLLocal(fin));
  
  // Obtenemos los bolsones del mes utilizando la función mejorada del repositorio
  const bolsonesMes = await bolsonRepository.obtenerStockDelMes(fecha);
  
  // Registro detallado para depuración
  console.log(`[STOCK_ACUMULADO_MES] Total bolsones recibidos: ${bolsonesMes.length}`);
  
  // Detalle de cada bolsón para diagnóstico (limitado a los primeros 10)
  const maxLog = Math.min(10, bolsonesMes.length);
  for (let i = 0; i < maxLog; i++) {
    const b = bolsonesMes[i];
    console.log(`[STOCK_ACUMULADO_MES] Bolsón ${i+1}/${bolsonesMes.length}: ID=${b.id}, Producto=${b.producto}, Nombre=${b.nombreProducto}, Fecha=${b.fecha}, Hora=${b.hora}`);
  }
  
  // Agrupar por producto usando un enfoque más robusto
  const suma = {};
  for (const b of bolsonesMes) {
    const productoId = b.producto;
    const productoNombre = b.nombreProducto || `Producto ID ${productoId}`;
    
    const key = productoId; // Usamos directamente el ID del producto como clave
    
    if (!suma[key]) {
      suma[key] = { 
        productoId, 
        nombre: productoNombre, 
        cantidadBolsones: 0, 
        pesoTotal: 0 
      };
    }
    suma[key].cantidadBolsones += 1;
    suma[key].pesoTotal += Number(b.peso || 0);
    
    // Log para cada bolsón procesado
    console.log(`[STOCK_ACUMULADO_MES] Agregando al producto ${key} (${productoNombre}): +${b.peso} kg, total=${suma[key].pesoTotal} kg`);
  }
  
  // Log final de productos agrupados
  console.log(`[STOCK_ACUMULADO_MES] Productos agrupados: ${Object.keys(suma).length}`);
  Object.entries(suma).forEach(([key, value]) => {
    console.log(`[STOCK_ACUMULADO_MES] - Producto ${key}: ${value.nombre}, ${value.cantidadBolsones} bolsones, ${value.pesoTotal} kg`);
  });
  
  return { productos: Object.values(suma) };
};

// DESPACHOS del MES OPERATIVO (despachados en el mes HASTA la fecha seleccionada)
const obtenerDespachosAcumuladosDelMes = async (fecha /* 'YYYY-MM-DD' */) => {
  console.log(`[REPORTE] Obteniendo despachos acumulados hasta ${fecha}`);
  
  try {
    // Utilizamos la nueva función que solo considera despachos hasta la fecha seleccionada
    console.log(`[DESPACHOS_ACUMULADOS_MES] Llamando al repositorio con fecha: ${fecha}`);
    const despachosMes = await despachoRepository.obtenerDespachadosDelMesHastaFecha(fecha);
    
    // Registro detallado para depuración
    console.log(`[DESPACHOS_ACUMULADOS_MES] Total productos despachados recibidos del repositorio: ${despachosMes.length}`);
    console.log(`[DESPACHOS_ACUMULADOS_MES] Datos recibidos del repositorio:`, JSON.stringify(despachosMes));
    
    // Detalle de cada producto despachado para diagnóstico
    for (let i = 0; i < despachosMes.length; i++) {
      const d = despachosMes[i];
      console.log(`[DESPACHOS_ACUMULADOS_MES] Producto ${i+1}: ID=${d.productoId}, Nombre=${d.nombreProducto || 'Sin nombre'}, Cantidad=${d.cantidadBolsones || 0}, Peso=${d.pesoTotal || 0}`);
    }
    
    if (despachosMes.length === 0) {
      console.log(`[DESPACHOS_ACUMULADOS_MES] ¡ADVERTENCIA! No se encontraron productos despachados en el mes hasta ${fecha}`);
    }
    
    // Verificar si hay datos nulos o indefinidos
    despachosMes.forEach((d, idx) => {
      if (!d.productoId) {
        console.log(`[DESPACHOS_ACUMULADOS_MES] ¡ADVERTENCIA! Producto ${idx+1} tiene ID nulo o indefinido`);
      }
      if (!d.cantidadBolsones && d.cantidadBolsones !== 0) {
        console.log(`[DESPACHOS_ACUMULADOS_MES] ¡ADVERTENCIA! Producto ${d.productoId || idx+1} tiene cantidad nula o indefinida`);
      }
      if (!d.pesoTotal && d.pesoTotal !== 0) {
        console.log(`[DESPACHOS_ACUMULADOS_MES] ¡ADVERTENCIA! Producto ${d.productoId || idx+1} tiene peso nulo o indefinido`);
      }
    });
    
    // Procesamos los resultados para el formato esperado en el reporte
    const productos = despachosMes.map(d => ({
      productoId: d.productoId,
      nombre: d.nombreProducto || `Producto ID ${d.productoId}`,
      cantidadBolsones: Number(d.cantidadBolsones || 0),
      pesoTotal: Number(d.pesoTotal || 0)
    }));
    
    console.log(`[DESPACHOS_ACUMULADOS_MES] Datos procesados final:`, JSON.stringify(productos));
    
    // Verificación final del resultado
    if (productos.length > 0) {
      console.log(`[DESPACHOS_ACUMULADOS_MES] ✓ Se encontraron ${productos.length} productos despachados para incluir en el reporte`);
    } else {
      console.log(`[DESPACHOS_ACUMULADOS_MES] ✗ No se encontraron productos despachados para incluir en el reporte`);
      
      // Intentar una consulta directa para diagnóstico
      console.log('[DESPACHOS_ACUMULADOS_MES] Intentando consulta manual de diagnóstico...');
      const db = require('../config/db');
      const { ventanaMesOperativo, formatMySQLLocal } = require('../utils/fecha');
      
      const { inicio } = ventanaMesOperativo(fecha);
      const inicioMesOperativo = formatMySQLLocal(inicio);
      
      const fechaFinDia = new Date(fecha);
      fechaFinDia.setHours(23, 59, 59, 999);
      const finDiaStr = formatMySQLLocal(fechaFinDia);
      
      try {
        const diagnosticoQuery = `
          SELECT 
              dd.producto AS productoId,
              GROUP_CONCAT(DISTINCT d.id) AS despachos_ids,
              COUNT(dd.id) AS cantidadBolsones
          FROM despachos_detalle dd
          JOIN despachos d ON dd.despacho_id = d.id
          WHERE d.fecha BETWEEN ? AND ?
          GROUP BY dd.producto
        `;
        
        const resultDiag = await db.query(diagnosticoQuery, [inicioMesOperativo, finDiaStr]);
        console.log(`[DESPACHOS_ACUMULADOS_MES] Resultado diagnóstico directo: ${resultDiag.length} productos`);
        for (const r of resultDiag) {
          console.log(`[DESPACHOS_ACUMULADOS_MES] - Producto ${r.productoId}, Cantidad: ${r.cantidadBolsones}, Despachos IDs: ${r.despachos_ids}`);
        }
      } catch (e) {
        console.error('[DESPACHOS_ACUMULADOS_MES] Error en consulta diagnóstico:', e);
      }
    }
    
    return { productos };
  } catch (error) {
    console.error('[DESPACHOS_ACUMULADOS_MES] Error al obtener despachos acumulados:', error);
    console.error('[DESPACHOS_ACUMULADOS_MES] Stack:', error.stack);
    // En caso de error, devolver un array vacío para evitar fallos en el reporte
    return { productos: [] };
  }
};

// NFU - Cantidad ingresada en una fecha específica
const obtenerIngresoNFUPorFecha = async (fecha /* 'YYYY-MM-DD' */) => {
  const cantidadTotal = await nfuRepository.obtenerCantidadNFUPorFecha(fecha);
  return {
    fecha,
    cantidadTotal: Number(cantidadTotal || 0)
  };
};

// NFU - Stock acumulado del mes operativo
const obtenerNFUAcumuladoDelMes = async (fecha /* 'YYYY-MM-DD' */) => {
  const { inicio, fin } = ventanaMesOperativo(fecha);
  console.log('[RANGO MES OPERATIVO NFU]', formatMySQLLocal(inicio), '->', formatMySQLLocal(fin));
  
  const cantidadTotal = await nfuRepository.obtenerCantidadNFUEntreFechas(
    formatMySQLLocal(inicio), 
    formatMySQLLocal(fin)
  );
  
  return {
    fechaInicio: formatMySQLLocal(inicio),
    fechaFin: formatMySQLLocal(fin),
    cantidadTotal: Number(cantidadTotal || 0)
  };
};

// NFU - Stock acumulado histórico hasta la fecha
const obtenerNFUAcumuladoHastaFecha = async (fecha /* 'YYYY-MM-DD' */) => {
  const cantidadTotal = await nfuRepository.obtenerCantidadNFUHastaFecha(fecha);
  return {
    fecha,
    cantidadTotal: Number(cantidadTotal || 0)
  };
};

// Función para calcular proyecciones según la fórmula:
// (días hábiles transcurridos / kilos acumulados) * total días hábiles del mes
const calcularProyeccion = async (fecha, datosAcumulados) => {
  try {
    // Obtener el mes y año de la fecha
    const fechaObj = new Date(fecha);
    const mes = fechaObj.getMonth() + 1; // JavaScript meses son 0-11
    const anio = fechaObj.getFullYear();
    const diaActual = fechaObj.getDate();
    
    // Obtener los días hábiles del mes
    const diasHabilesMes = await diasHabilesRepository.obtenerDiasHabilesSeleccionados(mes, anio);
    
    // Si no hay días hábiles definidos, no podemos calcular la proyección
    if (!diasHabilesMes || diasHabilesMes.length === 0) {
      console.log(`No hay días hábiles definidos para ${mes}/${anio}`);
      return null;
    }
    
    // Calcular días hábiles transcurridos hasta la fecha
    const diasHabilesTranscurridos = diasHabilesMes.filter(dia => dia <= diaActual);
    
    // Si no hay días hábiles transcurridos, no podemos calcular la proyección
    if (diasHabilesTranscurridos.length === 0) {
      console.log(`No hay días hábiles transcurridos hasta ${fecha}`);
      return null;
    }
    
    // Total de días hábiles del mes
    const totalDiasHabilesMes = diasHabilesMes.length;
    
    // Calcular proyección para cada elemento en datosAcumulados
    const proyeccion = {};
    
    for (const [key, valor] of Object.entries(datosAcumulados)) {
      // La fórmula: (valor / días transcurridos) * total días
      const valorDiario = valor / diasHabilesTranscurridos.length;
      proyeccion[key] = valorDiario * totalDiasHabilesMes;
    }
    
    return {
      diasHabilesTotal: totalDiasHabilesMes,
      diasHabilesTranscurridos: diasHabilesTranscurridos.length,
      proyeccion
    };
  } catch (error) {
    console.error('Error al calcular proyección:', error);
    return null;
  }
};

// REPORTE COMPLETO DIARIO (producción, despachos, stock del mes y despachos del mes)
const obtenerReporteCompleto = async (fecha /* 'YYYY-MM-DD' */) => {
  // Asegurarnos de que la fecha se procese correctamente para evitar problemas de zona horaria
  // Extraer y preservar exactamente la fecha solicitada
  const [year, month, day] = fecha.split('-').map(Number);
  
  // Obtener todos los datos básicos del reporte
  const [produccion, despachos, stockAcMes, despAcMes, stockHist, nfuDiario, nfuAcumuladoMes, nfuAcumuladoHist] = await Promise.all([
    obtenerSumatoriaPorProducto(fecha),
    obtenerDespachosPorProducto(fecha),
    obtenerStockAcumuladoDelMes(fecha),
    obtenerDespachosAcumuladosDelMes(fecha),
    obtenerStockAcumuladoHastaFecha(fecha),
    obtenerIngresoNFUPorFecha(fecha),
    obtenerNFUAcumuladoDelMes(fecha),
    obtenerNFUAcumuladoHastaFecha(fecha)
  ]);

  // Calcular proyecciones
  
  // 1. Proyección para NFU
  const datosNFU = {
    cantidadTotal: nfuAcumuladoMes.cantidadTotal
  };
  const proyeccionNFU = await calcularProyeccion(fecha, datosNFU);
  
  // 2. Proyección para cada producto en producción mensual
  const datosProduccion = {};
  stockAcMes.productos.forEach(prod => {
    datosProduccion[prod.productoId] = prod.pesoTotal;
  });
  const proyeccionProduccion = await calcularProyeccion(fecha, datosProduccion);
  
  // Añadir proyección a cada producto
  const stockAcumuladoMesConProyeccion = stockAcMes.productos.map(prod => {
    return {
      ...prod,
      proyeccion: proyeccionProduccion && proyeccionProduccion.proyeccion ? 
                  proyeccionProduccion.proyeccion[prod.productoId] || 0 : 0
    };
  });

  return {
    // Devolver exactamente la fecha solicitada para evitar problemas de zona horaria
    fecha: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
    produccion,
    despachos,
    stockAcumuladoMes: stockAcumuladoMesConProyeccion,
    despachosAcumuladosMes: despAcMes.productos,
    stockAcumuladoHistorico: stockHist.productos,
    nfu: {
      diario: nfuDiario,
      acumuladoMes: {
        ...nfuAcumuladoMes,
        proyeccion: proyeccionNFU && proyeccionNFU.proyeccion ? proyeccionNFU.proyeccion.cantidadTotal : 0
      },
      acumuladoHistorico: nfuAcumuladoHist
    },
    proyeccionInfo: {
      nfu: proyeccionNFU,
      produccion: proyeccionProduccion
    }
  };
};

module.exports = {
  obtenerSumatoriaPorProducto,
  obtenerDespachosPorProducto,
  obtenerReporteCompleto,
  obtenerStockAcumuladoHastaFecha,
  obtenerStockAcumuladoDelMes,
  obtenerDespachosAcumuladosDelMes,
  // Nuevas funciones para NFU
  obtenerIngresoNFUPorFecha,
  obtenerNFUAcumuladoDelMes,
  obtenerNFUAcumuladoHastaFecha,
};