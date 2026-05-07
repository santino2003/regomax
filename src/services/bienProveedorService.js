const bienProveedorRepository = require('../repositories/bienProveedorRepository');

class BienProveedorService {
    async crearAsociacionesProveedores(bienId, proveedores) { 
        try {
            // Validar que proveedores sea un array
            if (!Array.isArray(proveedores) || proveedores.length === 0) {
                return {
                    success: true,
                    message: 'No hay proveedores para asociar',
                    data: []
                };
            }

            // Validar formato de cada tupla
            for (let i = 0; i < proveedores.length; i++) {
                const proveedor = proveedores[i];
                
                if (!Array.isArray(proveedor) || proveedor.length !== 3) {
                    throw new Error(`El proveedor en posición ${i} debe ser una tupla [id, precio, moneda]`);
                }

                const [proveedorId, precio, moneda] = proveedor;

                if (!proveedorId || precio === null || precio === undefined || !moneda) {
                    throw new Error(`Datos incompletos en proveedor ${i}: se requiere id, precio y moneda`);
                }
            }

            // Delegar al repository que maneja la transacción
            const resultados = await bienProveedorRepository.crearAsociaciones(bienId, proveedores);

            return {
                success: true,
                message: `Se crearon ${resultados.length} asociaciones con proveedores`,
                data: resultados
            };

        } catch (error) {
            console.error('Error en BienProveedorService.crearAsociacionesProveedores:', error);
            throw error;
        }
    }

    /**
     * Editar asociaciones de proveedores para un bien existente
     * Registra nuevos precios sin borrar el historial existente
     */
    async editarAsociacionesProveedores(bienId, proveedores) {
        try {
            // Validar que proveedores sea un array
            if (!Array.isArray(proveedores)) {
                throw new Error('Los proveedores deben ser un array');
            }

            // Si el array está vacío, no se eliminan asociaciones para preservar historial
            if (proveedores.length === 0) {
                return {
                    success: true,
                    message: 'No se informaron proveedores; se mantiene el historial existente',
                    data: []
                };
            }

            // Validar formato de cada tupla
            for (let i = 0; i < proveedores.length; i++) {
                const proveedor = proveedores[i];
                
                if (!Array.isArray(proveedor) || proveedor.length !== 3) {
                    throw new Error(`El proveedor en posición ${i} debe ser una tupla [id, precio, moneda]`);
                }

                const [proveedorId, precio, moneda] = proveedor;

                if (!proveedorId || precio === null || precio === undefined || !moneda) {
                    throw new Error(`Datos incompletos en proveedor ${i}: se requiere id, precio y moneda`);
                }
            }

            // Delegar al repository que maneja la transacción (elimina y crea)
            const resultados = await bienProveedorRepository.editarAsociaciones(bienId, proveedores);

            return {
                success: true,
                message: `Se actualizaron las asociaciones: ${resultados.length} proveedores`,
                data: resultados
            };

        } catch (error) {
            console.error('Error en BienProveedorService.editarAsociacionesProveedores:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los bienes asociados a un proveedor
     */
    async obtenerBienesPorProveedor(proveedorId) {
        try {
            const bienes = await bienProveedorRepository.obtenerBienesPorProveedor(proveedorId);
            
            return {
                success: true,
                data: bienes
            };
        } catch (error) {
            console.error('Error en BienProveedorService.obtenerBienesPorProveedor:', error);
            throw error;
        }
    }

    /**
     * Obtener el precio del proveedor para un bien específico
     * Busca en la tabla de relación bienes_proveedores
     */
    async obtenerPrecioProveedorBien(bienId, proveedorId) {
        try {
            if (!bienId || !proveedorId) {
                throw new Error('El ID del bien y del proveedor son requeridos');
            }

            const precioInfo = await bienProveedorRepository.obtenerPrecioProveedorBien(bienId, proveedorId);
            
            if (!precioInfo) {
                throw new Error('No se encontró información de precio para este bien y proveedor');
            }

            return {
                success: true,
                data: precioInfo
            };
        } catch (error) {
            console.error('❌ [bienProveedorService] Error en obtenerPrecioProveedorBien:', error);
            throw error;
        }
    }

    /**
     * Obtener historial completo de precios de un bien
     */
    async obtenerHistorialPorBien(bienId) {
        try {
            if (!bienId) {
                throw new Error('El ID del bien es requerido');
            }

            const historial = await bienProveedorRepository.obtenerHistorialPorBien(bienId);

            return {
                success: true,
                data: historial
            };
        } catch (error) {
            console.error('Error en BienProveedorService.obtenerHistorialPorBien:', error);
            throw error;
        }
    }

    /**
     * Obtener historial completo de precios de un proveedor
     */
    async obtenerHistorialPorProveedor(proveedorId) {
        try {
            if (!proveedorId) {
                throw new Error('El ID del proveedor es requerido');
            }

            const historial = await bienProveedorRepository.obtenerHistorialPorProveedor(proveedorId);

            return {
                success: true,
                data: historial
            };
        } catch (error) {
            console.error('Error en BienProveedorService.obtenerHistorialPorProveedor:', error);
            throw error;
        }
    }
}

module.exports = new BienProveedorService();