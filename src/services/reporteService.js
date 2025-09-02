const bolsonRepository = require('../repositories/bolsonRepository');
const despachoRepository = require('../repositories/despachoRepository');
const nfuRepository = require('../repositories/nfuRepository');
const diasHabilesRepository = require('../repositories/diasHabilesRepository');
const { ventanaMesOperativo, formatMySQLLocal } = require('../utils/fecha');

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
  const bolsonesMes = await bolsonRepository.obtenerStockDelMes(fecha);
  const suma = {};
  for (const b of bolsonesMes){
    const productoId = b.producto;
    if (!suma[productoId]){
      suma[productoId] = { productoId, nombre: b.nombreProducto || `Producto ID ${productoId}`, cantidadBolsones: 0, pesoTotal: 0 };
    }
    suma[productoId].cantidadBolsones += 1;
    suma[productoId].pesoTotal += Number(b.peso || 0);
  }
  return { productos: Object.values(suma) };
};

// DESPACHOS del MES OPERATIVO (despachados en el mes)
const obtenerDespachosAcumuladosDelMes = async (fecha /* 'YYYY-MM-DD' */) => {
  const { inicio, fin } = ventanaMesOperativo(fecha);
  console.log('[RANGO MES OPERATIVO DESPACHOS]', formatMySQLLocal(inicio), '->', formatMySQLLocal(fin));
  const bolsonesMes = await bolsonRepository.obtenerDespachadosDelMes(fecha);
  const suma = {};
  for (const b of bolsonesMes){
    const productoId = b.producto;
    if (!suma[productoId]){
      suma[productoId] = { productoId, nombre: b.nombreProducto || `Producto ID ${productoId}`, cantidadBolsones: 0, pesoTotal: 0 };
    }
    suma[productoId].cantidadBolsones += 1;
    suma[productoId].pesoTotal += Number(b.peso || 0);
  }
  return { productos: Object.values(suma) };
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
    fecha,
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