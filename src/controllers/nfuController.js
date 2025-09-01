const reporteService = require('../services/reporteService');
const nfuRepository = require('../repositories/nfuRepository');

// Obtener la cantidad de kg de NFU que entró en un día determinado
const obtenerKgPorDia = async (req, res) => {
  try {
    const { fecha } = req.query;
    
    if (!fecha) {
      return res.status(400).json({
        success: false,
        mensaje: 'Se debe proporcionar una fecha (formato: YYYY-MM-DD)'
      });
    }
    
    const resultado = await reporteService.obtenerIngresoNFUPorFecha(fecha);
    
    res.status(200).json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error al obtener kg NFU por día:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener los kg NFU por día'
    });
  }
};

// Obtener el stock acumulado de NFU del mes
const obtenerStockAcumuladoDelMes = async (req, res) => {
  try {
    const { fecha } = req.query;
    
    if (!fecha) {
      return res.status(400).json({
        success: false,
        mensaje: 'Se debe proporcionar una fecha (formato: YYYY-MM-DD)'
      });
    }
    
    const resultado = await reporteService.obtenerNFUAcumuladoDelMes(fecha);
    
    res.status(200).json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error al obtener stock acumulado NFU del mes:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener el stock acumulado NFU del mes'
    });
  }
};

// Obtener el stock acumulado de NFU hasta una fecha
const obtenerStockAcumuladoHastaFecha = async (req, res) => {
  try {
    const { fecha } = req.query;
    
    if (!fecha) {
      return res.status(400).json({
        success: false,
        mensaje: 'Se debe proporcionar una fecha (formato: YYYY-MM-DD)'
      });
    }
    
    const resultado = await reporteService.obtenerNFUAcumuladoHastaFecha(fecha);
    
    res.status(200).json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error al obtener stock acumulado NFU hasta fecha:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener el stock acumulado NFU hasta la fecha'
    });
  }
};

module.exports = {
  obtenerKgPorDia,
  obtenerStockAcumuladoDelMes,
  obtenerStockAcumuladoHastaFecha
};