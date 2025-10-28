const reporteService = require('../services/reporteService');
const nfuService = require('../services/nfuService');
const clienteNFUService = require('../services/clienteNFUService');
const { formatMySQLLocal, formatearFechaLocal, formatearFechaHoraLocal, fechaActual } = require('../utils/fecha');

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
    const { fecha, cantidad, cliente_id, categoria, tipo } = req.body;
    const responsable = req.user.username;
    
    console.log('📄 Datos recibidos:', { fecha, cantidad, cliente_id, categoria, tipo, responsable });
    
    const resultado = await nfuService.registrarIngresoNFU(fecha, cantidad, responsable, cliente_id, categoria, tipo);
    console.log('✅ NFU registrado con éxito:', resultado);
    
    res.status(201).json({
      success: true,
      mensaje: 'Ingreso de NFU registrado correctamente',
      data: resultado
    });
  } catch (error) {
    console.error('❌ Error al registrar ingreso NFU:', error);
    res.status(500).json({
      success: false,
      mensaje: error.message || 'Error al registrar el ingreso de NFU'
    });
  }
};

// Renderizar vista para registrar nuevo ingreso de NFU
const mostrarFormularioIngresoNFU = async (req, res) => {
  try {
    // Obtener todos los clientes NFU para el selector
    let clientes = [];
    try {
      clientes = await clienteNFUService.obtenerTodos();
    } catch (error) {
      console.error('Error al obtener clientes NFU:', error);
      // Si falla, continuar con array vacío
    }
    
    res.render('nfuNuevo', {
      titulo: 'Registrar Ingreso de NFU',
      usuario: req.user,
      clientes: clientes || []
    });
  } catch (error) {
    console.error('Error al cargar formulario de ingreso NFU:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el formulario de ingreso NFU',
      error: { status: 500, stack: error.stack }
    });
  }
};

// Mostrar listado de ingresos de NFU
const listarNFU = async (req, res) => {
  try {
    // Parámetros de paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Filtros
    const filtros = {
      fechaDesde: req.query.fechaDesde || '',
      fechaHasta: req.query.fechaHasta || '',
      categoria: req.query.categoria || '',
      tipo: req.query.tipo || ''
    };
    
    // Obtener registros de NFU
    const registros = await nfuService.obtenerRegistrosNFU(page, limit, filtros);
    
    // Calcular total acumulado
    let totalKg = 0;
    if (registros && registros.data) {
      totalKg = registros.data.reduce((sum, item) => sum + parseFloat(item.cantidad), 0);
      
      // Formatear las fechas usando las utilidades
      registros.data = registros.data.map(item => ({
        ...item,
        fechaFormateada: formatearFechaLocal(item.fecha),
        fechaHoraRegistro: formatearFechaHoraLocal(item.created_at)
      }));
    }
    
    res.render('listarNFU', {
      title: 'Listado de Ingresos NFU',
      username: req.user.username,
      user: req.user,
      registros: registros.data || [],
      pagination: registros.pagination || {},
      filtros: filtros,
      totalKg: totalKg.toFixed(2),
      fechaActual: formatearFechaLocal(fechaActual())
    });
  } catch (error) {
    console.error('Error al listar registros NFU:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el listado de ingresos NFU',
      error: { status: 500, stack: error.stack }
    });
  }
};

// Exportar registros NFU a CSV
const exportarCSV = async (req, res) => {
  try {
    const filtros = {
      fechaDesde: req.query.fechaDesde || '',
      fechaHasta: req.query.fechaHasta || '',
      categoria: req.query.categoria || '',
      tipo: req.query.tipo || ''
    };

    // Obtener registros con los filtros aplicados
    const registros = await nfuService.obtenerConFiltros(filtros);

    // Construir el CSV
    let csv = 'Fecha,Responsable,Cliente,CUIT Cliente,Categoría,Tipo,Cantidad (Kg)\n';
    
    registros.forEach(registro => {
      const fecha = new Date(registro.fecha).toLocaleDateString('es-AR');
      const responsable = (registro.responsable || '').replace(/,/g, ';');
      const cliente = (registro.cliente_empresa || '-').replace(/,/g, ';');
      const cuit = (registro.cliente_cuit || '-').replace(/,/g, ';');
      const categoria = registro.categoria || '-';
      const tipo = registro.tipo || '-';
      const cantidad = registro.cantidad || 0;
      
      csv += `"${fecha}","${responsable}","${cliente}","${cuit}","${categoria}","${tipo}","${cantidad}"\n`;
    });

    // Configurar headers para descarga
    const filename = `ingresos_nfu_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Agregar BOM para UTF-8 (para que Excel lo reconozca)
    res.write('\uFEFF');
    res.end(csv);
  } catch (error) {
    console.error('Error al exportar CSV:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al exportar CSV',
      error: error.message
    });
  }
};

module.exports = {
  obtenerKgPorDia,
  obtenerStockAcumuladoDelMes,
  obtenerStockAcumuladoHastaFecha,
  registrarIngresoNFU,
  mostrarFormularioIngresoNFU,
  listarNFU,
  exportarCSV
};