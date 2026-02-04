const proveedorRepository = require('../repositories/proveedorRepository');

class ProveedorService {
    async crearProveedor(proveedorData) {
        try {
            const { nombre, contacto, telefono, email, direccion, web,rubro ,responsable } = proveedorData;

            if (!nombre || !contacto) {
                throw new Error('Datos incompletos para crear el proveedor');
            }

            await proveedorRepository.crearProveedor(
                nombre, contacto, telefono, email, direccion, web, rubro ,responsable
            );

            return {
                success: true,
                message: 'Proveedor creado exitosamente',
            };

        } catch (error) {
            console.error('Error en ProveedorService.crearProveedor:', error);
            throw error;
        }
    }
    

    async obtenerTodos(filtros = {}) {
        return await proveedorRepository.obtenerTodos(filtros);
    }

    async obtenerPorId(id) {
        try {
            const proveedor = await proveedorRepository.obtenerPorId(id);
            if (!proveedor) {
                throw new Error('Proveedor no encontrado');
            }
            return proveedor;
        } catch (error) {
            console.error('Error en ProveedorService.obtenerPorId:', error);
            throw error;
        }
    }

    async eliminar(id) {
        try {
            // Verificar que el proveedor existe
            const proveedor = await proveedorRepository.obtenerPorId(id);
            if (!proveedor) {
                throw new Error('Proveedor no encontrado');
            }

            await proveedorRepository.eliminar(id);
            return {
                success: true,
                message: 'Proveedor eliminado exitosamente'
            };
        } catch (error) {
            console.error('Error en ProveedorService.eliminar:', error);
            throw error;
        }
    }

    async actualizar(id, proveedorData) {
        try {
            // Verificar que el proveedor existe
            const proveedor = await proveedorRepository.obtenerPorId(id);
            if (!proveedor) {
                throw new Error('Proveedor no encontrado');
            }

            const { nombre, contacto, telefono, email, direccion, web, rubro } = proveedorData;

            if (!nombre || !contacto) {
                throw new Error('Datos incompletos para actualizar el proveedor');
            }

            await proveedorRepository.actualizar(
                id, nombre, contacto, telefono, email, direccion, web, rubro
            );

            return {
                success: true,
                message: 'Proveedor actualizado exitosamente'
            };
        } catch (error) {
            console.error('Error en ProveedorService.actualizar:', error);
            throw error;
        }
    }
}

module.exports = new ProveedorService();