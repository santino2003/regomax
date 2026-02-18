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
     * Reemplaza todas las asociaciones existentes con las nuevas
     */
    async editarAsociacionesProveedores(bienId, proveedores) {
        try {
            // Validar que proveedores sea un array
            if (!Array.isArray(proveedores)) {
                throw new Error('Los proveedores deben ser un array');
            }

            // Si el array está vacío, eliminar todas las asociaciones
            if (proveedores.length === 0) {
                await bienProveedorRepository.eliminarAsociacionesPorBien(bienId);
                return {
                    success: true,
                    message: 'Se eliminaron todas las asociaciones de proveedores',
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
}

module.exports = new BienProveedorService();