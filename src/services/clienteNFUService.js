const clienteNFURepository = require('../repositories/clienteNFURepository');

class ClienteNFUService {
    async crearCliente(clienteData) {
        try {
            const { empresa, cuit, correo, telefono } = clienteData;

            if (!empresa || !cuit) {
                throw new Error('Datos incompletos para crear el cliente');
            }

            await clienteNFURepository.crearCliente(
                empresa, cuit, correo, telefono
            );

            return {
                success: true,
                message: 'Proveedor creado exitosamente',
            };

        } catch (error) {
            console.error('Error en clienteNFUService.crearCliente:', error);
            throw error;
        }
    }
    

    async obtenerTodos() {
        return await clienteNFURepository.obtenerTodos();
    }

    async obtenerConFiltros(filtros = {}) {
        return await clienteNFURepository.obtenerConFiltros(filtros);
    }

    async obtenerPorId(id) {
        try {
            const cliente = await clienteNFURepository.obtenerPorId(id);
            if (!cliente) {
                throw new Error('Cliente no encontrado');
            }
            return cliente;
        } catch (error) {
            console.error('Error en clienteNFUService.obtenerPorId:', error);
            throw error;
        }
    }

    async actualizarCliente(id, clienteData) {
        try {
            const { empresa, cuit, correo, telefono } = clienteData;

            if (!empresa || !cuit) {
                throw new Error('Datos incompletos para actualizar el cliente');
            }

            await clienteNFURepository.actualizarCliente(id, empresa, cuit, correo, telefono);

            return {
                success: true,
                message: 'Cliente actualizado exitosamente',
            };
        } catch (error) {
            console.error('Error en clienteNFUService.actualizarCliente:', error);
            throw error;
        }
    }

    async eliminarCliente(id) {
        try {
            await clienteNFURepository.eliminarCliente(id);
            return {
                success: true,
                message: 'Cliente eliminado exitosamente',
            };
        } catch (error) {
            console.error('Error en clienteNFUService.eliminarCliente:', error);
            throw error;
        }
    }
}

module.exports = new ClienteNFUService();