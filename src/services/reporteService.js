const bolsonRepository = require('../repositories/bolsonRepository');
const despachoRepository = require('../repositories/despachoRepository');
const nfuRepository = require('../repositories/nfuRepository');
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

// REPORTE COMPLETO DIARIO (producción, despachos, stock del mes y despachos del mes)
const obtenerReporteCompleto = async (fecha /* 'YYYY-MM-DD' */) => {
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

  return {
    fecha,
    produccion,
    despachos,
    stockAcumuladoMes: stockAcMes.productos,
    despachosAcumuladosMes: despAcMes.productos,
    stockAcumuladoHistorico: stockHist.productos,
    nfu: {
      diario: nfuDiario,
      acumuladoMes: nfuAcumuladoMes,
      acumuladoHistorico: nfuAcumuladoHist
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