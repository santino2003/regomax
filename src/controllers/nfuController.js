const reporteService = require('../services/reporteService');
const nfuRepository = require('../repositories/nfuRepository');
const { formatMySQLLocal } = require('../utils/fecha');

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

// Registrar nuevo ingreso de NFU
const registrarIngresoNFU = async (req, res) => {
  try {
    console.log('📝 Iniciando registro de NFU...');
    const { fecha, cantidad } = req.body;
    const responsable = req.user.username;
    
    console.log('📄 Datos recibidos:', { fecha, cantidad, responsable });
    
    if (!fecha || !cantidad) {
      console.log('❌ Error: Faltan datos obligatorios');
      return res.status(400).json({
        success: false,
        mensaje: 'Se deben proporcionar fecha y cantidad'
      });
    }
    
    const cantidadNum = parseFloat(cantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      console.log('❌ Error: Cantidad inválida');
      return res.status(400).json({
        success: false,
        mensaje: 'La cantidad debe ser un número positivo'
      });
    }
    
    // Registrar en la base de datos
    console.log('💾 Intentando insertar en la base de datos...');
    try {
      const id = await nfuRepository.insertarNFU(fecha, cantidadNum, responsable);
      console.log('✅ NFU registrado con éxito, ID:', id);
      
      // Ya no intentamos registrar en historial porque quitamos el middleware
      /* 
      if (req.registrarHistorial) {
        console.log('📝 Registrando en historial...');
        req.registrarHistorial('crear', 'nfu', id, `Ingreso de ${cantidadNum} kg de NFU`);
        console.log('✅ Historial registrado');
      }
      */
      
      res.status(201).json({
        success: true,
        mensaje: 'Ingreso de NFU registrado correctamente',
        data: {
          id,
          fecha,
          cantidad: cantidadNum,
          responsable
        }
      });
    } catch (dbError) {
      console.error('❌ Error en la base de datos:', dbError);
      throw dbError; // Relanzamos el error para que lo maneje el catch exterior
    }
  } catch (error) {
    console.error('❌ Error al registrar ingreso NFU:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al registrar el ingreso de NFU: ' + error.message
    });
  }
};

// Renderizar vista para registrar nuevo ingreso de NFU
const mostrarFormularioIngresoNFU = (req, res) => {
  res.render('nfuNuevo', {
    titulo: 'Registrar Ingreso de NFU',
    usuario: req.user
  });
};

module.exports = {
  obtenerKgPorDia,
  obtenerStockAcumuladoDelMes,
  obtenerStockAcumuladoHastaFecha,
  registrarIngresoNFU,
  mostrarFormularioIngresoNFU
};