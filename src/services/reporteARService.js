const reporteARRepository = require('../repositories/reporteARRepository');

const obtenerStockTotal = async (fecha) => {
    const sumatoria = await reporteARRepository.obtenerStockTotal(fecha);
    return sumatoria;
}

const obtenerProduccionTotal = async (fecha) => {
    const sumatoria = await reporteARRepository.obtenerProduccionTotal(fecha);
    return sumatoria;
}

const obtenerLogisticasDetalle = async (fecha) => {
    const logisticas = await reporteARRepository.obtenerLogisticasDetalle(fecha);
    return logisticas;
}

const obtenerReporteAR = async (fecha) => {
    const stockTotal = await obtenerStockTotal(fecha);
    const produccionTotal = await obtenerProduccionTotal(fecha);
    const logisticasDetalle = await obtenerLogisticasDetalle(fecha);

    // Calculamos la sumatoria total de kilos
    const kilosTotales = stockTotal.reduce((acumulador, producto) => {
        return acumulador + parseFloat(producto.pesoTotal || 0);
    }, 0);

    const kilosProduccion = produccionTotal.reduce((acumulador, producto) => {
        return acumulador + parseFloat(producto.pesoTotal || 0);
    }, 0);

    return {
        kilosTotales,
        kilosProduccion,
        logisticasDetalle
    };
}

module.exports = {
    obtenerReporteAR
}