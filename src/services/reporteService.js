const bolsonRepository = require('../repositories/bolsonRepository');
const despachoRepository = require('../repositories/despachoRepository');
const nfuRepository = require('../repositories/nfuRepository');
const diasHabilesRepository = require('../repositories/diasHabilesRepository');
const planificacionRepository = require('../repositories/planificacionRepository');
const productoRepository = require('../repositories/productoRepository');
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
        nombre: b.nombreProducto || `${productoId}`,
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
    nombre: r.nombreProducto || `${r.productoId}`,
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
      suma[productoId] = { productoId, nombre: b.nombreProducto || `${productoId}`, cantidadBolsones: 0, pesoTotal: 0 };
    }
    suma[productoId].cantidadBolsones += 1;
    suma[productoId].pesoTotal += Number(b.peso || 0);
  }
  return { productos: Object.values(suma) };
};

// STOCK del MES OPERATIVO (producidos en el mes y NO despachados)
const obtenerStockAcumuladoDelMes = async (fecha /* 'YYYY-MM-DD' */) => {
  const { inicio, fin } = ventanaMesOperativo(fecha);
  
  // Obtenemos los bolsones del mes utilizando la función mejorada del repositorio
  const bolsonesMes = await bolsonRepository.obtenerStockDelMes(fecha);
  
  // Agrupar por producto usando un enfoque más robusto
  const suma = {};
  for (const b of bolsonesMes) {
    const productoId = b.producto;
    const productoNombre = b.nombreProducto || `${productoId}`;
    
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
  }
  
  return { productos: Object.values(suma) };
};

// DESPACHOS del MES OPERATIVO (despachados en el mes HASTA la fecha seleccionada)
const obtenerDespachosAcumuladosDelMes = async (fecha /* 'YYYY-MM-DD' */) => {
  try {
    // Utilizamos la nueva función que solo considera despachos hasta la fecha seleccionada
    const despachosMes = await despachoRepository.obtenerDespachadosDelMesHastaFecha(fecha);
    
    if (despachosMes.length === 0) {
      // Intentar una consulta directa para diagnóstico
      const db = require('../config/db');
      const { ventanaMesOperativo, formatMySQLLocal } = require('../utils/fecha');
      
      const { inicio } = ventanaMesOperativo(fecha);
      const inicioMesOperativo = formatMySQLLocal(inicio);
      
      const fechaFinDia = new Date(fecha);
      fechaFinDia.setHours(23, 59, 59, 999);
      const finDiaStr = formatMySQLLocal(fechaFinDia);
    }
    
    // Procesamos los resultados para el formato esperado en el reporte
    const productos = despachosMes.map(d => ({
      productoId: d.productoId,
      nombre: d.nombreProducto || `${d.productoId}`,
      cantidadBolsones: Number(d.cantidadBolsones || 0),
      pesoTotal: Number(d.pesoTotal || 0)
    }));
    
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

// Obtener planificación diaria
const obtenerPlanificacionPorFecha = async (fecha /* 'YYYY-MM-DD' */) => {
  try {
    // Extraer día, mes y año de la fecha
    const [year, month, day] = fecha.split('-').map(Number);
    
    // Obtener la planificación para este día
    const planificacion = await planificacionRepository.obtenerPlanificacion(year, month, day);
    
    // Si no hay planificación, retornar objeto vacío
    if (!planificacion) {
      return { productos: {} };
    }
    
    // Necesitamos obtener los productos reales para mapear los IDs
    const productos = await productoRepository.obtenerTodos();
    
    // Crear un mapeo de ID numérico a nombre de producto
    const idToProductMap = {};
    productos.forEach(prod => {
      idToProductMap[prod.id] = prod.nombre;
    });
    
    // Transformar el objeto de productos para usar nombres como keys
    const productosTransformados = {};
    for (const [productoId, kilos] of Object.entries(planificacion.productos)) {
      // Si encontramos el producto por ID numérico, usamos su nombre como key
      const nombre = idToProductMap[productoId];
      if (nombre) {
        productosTransformados[nombre] = kilos;
      } else {
        // Si no lo encontramos, mantenemos el ID original
        productosTransformados[productoId] = kilos;
      }
    }
    
    return { 
      fecha,
      productos: productosTransformados
    };
  } catch (error) {
    console.error('Error al obtener planificación diaria:', error);
    return { productos: {} };
  }
};

// Función para calcular proyecciones según la fórmula:
// (días hábiles transcurridos / kilos acumulados) * total días hábiles del mes
const calcularProyeccion = async (fecha, datosAcumulados) => {
  try {
    // Parsear la fecha correctamente para evitar problemas de zona horaria
    const fechaObj = parseLocalDate(fecha);
    
    // Extraer día, mes y año directamente de la cadena de fecha para evitar problemas de zona horaria
    const [year, month, day] = fecha.split('-').map(Number);
    const mes = month; // month ya es 1-12 al extraerlo directamente del string
    const anio = year;
    const diaActual = day;
    
    // Obtener los días hábiles del mes
    const diasHabilesMes = await diasHabilesRepository.obtenerDiasHabilesSeleccionados(mes, anio);
    
    // Si no hay días hábiles definidos, usar días calendario del mes
    let totalDiasHabilesMes = diasHabilesMes.length;
    if (!diasHabilesMes || diasHabilesMes.length === 0) {
      totalDiasHabilesMes = new Date(anio, mes, 0).getDate(); // Último día del mes
    }
    
    // Calcular días hábiles transcurridos hasta la fecha
    // Para el día 1, siempre considerar al menos 1 día transcurrido
    const diasHabilesTranscurridos = diasHabilesMes.filter(dia => dia <= diaActual);
    const diasTranscurridos = Math.max(diasHabilesTranscurridos.length, 1); // Mínimo 1 día
    
    // Calcular proyección para cada elemento en datosAcumulados
    const proyeccion = {};
    
    for (const [key, valor] of Object.entries(datosAcumulados)) {
      if (valor > 0) {
        // La fórmula: (valor / días transcurridos) * total días
        const valorDiario = valor / diasTranscurridos;
        proyeccion[key] = Math.round(valorDiario * totalDiasHabilesMes);
      } else {
        proyeccion[key] = 0;
      }
    }
    
    return {
      diasHabilesTotal: totalDiasHabilesMes,
      diasHabilesTranscurridos: diasTranscurridos,
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
  const [produccion, despachos, stockAcMes, despAcMes, stockHist, nfuDiario, nfuAcumuladoMes, nfuAcumuladoHist, planificacionDiaria] = await Promise.all([
    obtenerSumatoriaPorProducto(fecha),
    obtenerDespachosPorProducto(fecha),
    obtenerStockAcumuladoDelMes(fecha),
    obtenerDespachosAcumuladosDelMes(fecha),
    obtenerStockAcumuladoHastaFecha(fecha),
    obtenerIngresoNFUPorFecha(fecha),
    obtenerNFUAcumuladoDelMes(fecha),
    obtenerNFUAcumuladoHastaFecha(fecha),
    obtenerPlanificacionPorFecha(fecha) // Añadir la obtención de planificación diaria
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
  
  // 3. Proyección para cada producto en despachos mensuales
  const datosDespachos = {};
  despAcMes.productos.forEach(desp => {
    datosDespachos[desp.productoId] = desp.pesoTotal;
  });
  const proyeccionDespachos = await calcularProyeccion(fecha, datosDespachos);
  
  // Añadir proyección y planificación a cada producto en producción diaria
  const produccionConPlanificacion = produccion.map(prod => {
    // Obtener el valor de planificación para este producto (si existe)
    // Primero intenta buscar por ID, luego por nombre
    const planificacionProducto = planificacionDiaria.productos[prod.productoId] || 
                                  planificacionDiaria.productos[prod.nombre] || 0;
    
    return {
      ...prod,
      planificacion: Number(planificacionProducto)
    };
  });
  
  // Añadir proyección y planificación a cada producto en stock acumulado del mes
  const stockAcumuladoMesConProyeccion = stockAcMes.productos.map(prod => {
    // Obtener el valor de planificación para este producto (si existe)
    // Primero intenta buscar por ID, luego por nombre
    const planificacionProducto = planificacionDiaria.productos[prod.productoId] || 
                                  planificacionDiaria.productos[prod.nombre] || 0;
    
    return {
      ...prod,
      proyeccion: proyeccionProduccion && proyeccionProduccion.proyeccion ? 
                  proyeccionProduccion.proyeccion[prod.productoId] || 0 : 0,
      planificacion: Number(planificacionProducto)
    };
  });
  
  // Añadir proyección y planificación a cada despacho
  const despachosAcumuladosMesConProyeccion = despAcMes.productos.map(desp => {
    // Obtener el valor de planificación para este producto (si existe)
    // Primero intenta buscar por ID, luego por nombre
    const planificacionProducto = planificacionDiaria.productos[desp.productoId] || 
                                  planificacionDiaria.productos[desp.nombre] || 0;
    
    return {
      ...desp,
      proyeccion: proyeccionDespachos && proyeccionDespachos.proyeccion ?
                  proyeccionDespachos.proyeccion[desp.productoId] || 0 : 0,
      planificacion: Number(planificacionProducto)
    };
  });
  
  // Añadir planificación a productos en stock histórico
  const stockHistoricoConPlanificacion = stockHist.productos.map(prod => {
    // Obtener el valor de planificación para este producto (si existe)
    // Primero intenta buscar por ID, luego por nombre
    const planificacionProducto = planificacionDiaria.productos[prod.productoId] || 
                                  planificacionDiaria.productos[prod.nombre] || 0;
    
    return {
      ...prod,
      planificacion: Number(planificacionProducto)
    };
  });

  return {
    // Devolver exactamente la fecha solicitada para evitar problemas de zona horaria
    fecha: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
    produccion: produccionConPlanificacion,
    despachos,
    stockAcumuladoMes: stockAcumuladoMesConProyeccion,
    despachosAcumuladosMes: despachosAcumuladosMesConProyeccion,
    stockAcumuladoHistorico: stockHistoricoConPlanificacion,
    nfu: {
      diario: nfuDiario,
      acumuladoMes: {
        ...nfuAcumuladoMes,
        proyeccion: proyeccionNFU && proyeccionNFU.proyeccion ? proyeccionNFU.proyeccion.cantidadTotal : 0
      },
      acumuladoHistorico: nfuAcumuladoHist
    },
    planificacionDiaria, // Incluir la planificación diaria completa
    proyeccionInfo: {
      nfu: proyeccionNFU,
      produccion: proyeccionProduccion,
      despachos: proyeccionDespachos
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
  // Nueva función para planificación
  obtenerPlanificacionPorFecha,
};