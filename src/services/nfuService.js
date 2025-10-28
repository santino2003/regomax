const nfuRepository = require('../repositories/nfuRepository');

/**
 * Registrar un nuevo ingreso de NFU
 */
const registrarIngresoNFU = async (fecha, cantidad, responsable, cliente_id = null, categoria = null, tipo = null) => {
  try {
    // Validar datos
    if (!fecha || !cantidad) {
      throw new Error('Fecha y cantidad son obligatorios');
    }

    if (!cliente_id) {
      throw new Error('El cliente es obligatorio');
    }

    if (!categoria) {
      throw new Error('La categoría es obligatoria');
    }

    if (!tipo) {
      throw new Error('El tipo es obligatorio');
    }

    const cantidadNum = parseFloat(cantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      throw new Error('La cantidad debe ser un número positivo');
    }

    // Insertar en la base de datos
    const id = await nfuRepository.insertarNFU(fecha, cantidadNum, responsable, cliente_id, categoria, tipo);
    
    return {
      id,
      fecha,
      cantidad: cantidadNum,
      responsable,
      cliente_id,
      categoria,
      tipo
    };
  } catch (error) {
    console.error('Error en nfuService.registrarIngresoNFU:', error);
    throw error;
  }
};

/**
 * Obtener todos los registros de NFU
 */
const obtenerTodosNFU = async () => {
  try {
    return await nfuRepository.obtenerTodosNFU();
  } catch (error) {
    console.error('Error en nfuService.obtenerTodosNFU:', error);
    throw error;
  }
};

/**
 * Obtener registros NFU con paginación y filtros
 */
const obtenerRegistrosNFU = async (page, limit, filtros) => {
  try {
    return await nfuRepository.obtenerRegistrosNFU(page, limit, filtros);
  } catch (error) {
    console.error('Error en nfuService.obtenerRegistrosNFU:', error);
    throw error;
  }
};

/**
 * Obtener registros NFU con filtros (sin paginación, para exportar)
 */
const obtenerConFiltros = async (filtros) => {
  try {
    return await nfuRepository.obtenerConFiltros(filtros);
  } catch (error) {
    console.error('Error en nfuService.obtenerConFiltros:', error);
    throw error;
  }
};

module.exports = {
  registrarIngresoNFU,
  obtenerTodosNFU,
  obtenerRegistrosNFU,
  obtenerConFiltros
};
