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
    

    async obtenerTodos() {
        return await proveedorRepository.obtenerTodos();
    }
}

module.exports = new ProveedorService();