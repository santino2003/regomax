const clienteNFUService = require('../services/clienteNFUService');

const clientesNFUController = {
    async nuevoCliente(req, res) {
        try {
        const clienteNFUData = req.body;
        clienteNFUData.responsable = req.user.username;
        await clienteNFUService.crearCliente(clienteNFUData);
        return res.status(201).json({
            success: true,
            message: 'Cliente agregado exitosamente',
        });
        } catch (error) {
        console.error('Error al crear cliente:', error);
        return res.status(500).json({ error: 'Error al crear cliente' });
        }
    },

    async vistaListarClientes(req, res) {
        try {
            // Obtener los parámetros de filtro
            const filtros = {
                empresa: req.query.empresa || '',
                cuit: req.query.cuit || '',
            };
            
            // Obtener clientes con filtros aplicados
            const clientes = await clienteNFUService.obtenerConFiltros(filtros);
            
            res.render('listarClientes', {
                username: req.user.username,
                clientes,
                filtros
            });
        } catch (error) {
            console.error('Error al listar clientes:', error);
            res.status(500).render('error', {
                message: 'Error al listar clientes',
                error
            });
        }
    },

    async vistaNuevoCliente(req, res) {
        try {
            res.render('clientesNuevo', {
                title: 'Nuevo Cliente NFU',
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al renderizar la vista de nuevo cliente:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nuevo cliente',
                error
            });
        }
    },

    async vistaVerCliente(req, res) {
        try {
            const { id } = req.params;
            const cliente = await clienteNFUService.obtenerPorId(id);
            
            if (!cliente) {
                return res.status(404).render('error', {
                    message: 'Cliente no encontrado',
                    error: { status: 404 }
                });
            }

            res.render('clientesVer', {
                title: 'Detalle del Cliente NFU',
                username: req.user.username,
                cliente
            });
        } catch (error) {
            console.error('Error al renderizar la vista de cliente:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el cliente',
                error
            });
        }
    },

    async vistaEditarCliente(req, res) {
        try {
            const { id } = req.params;
            const cliente = await clienteNFUService.obtenerPorId(id);
            
            if (!cliente) {
                return res.status(404).render('error', {
                    message: 'Cliente no encontrado',
                    error: { status: 404 }
                });
            }

            res.render('clientesEditar', {
                title: 'Editar Cliente NFU',
                username: req.user.username,
                cliente
            });
        } catch (error) {
            console.error('Error al renderizar la vista de editar cliente:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de edición',
                error
            });
        }
    },

    async obtenerCliente(req, res) {
        try {
            const { id } = req.params;
            const cliente = await clienteNFUService.obtenerPorId(id);
            
            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }

            return res.status(200).json({
                success: true,
                data: cliente
            });
        } catch (error) {
            console.error('Error al obtener cliente:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener cliente',
                error: error.message
            });
        }
    },

    async actualizarCliente(req, res) {
        try {
            const { id } = req.params;
            const clienteData = req.body;
            
            await clienteNFUService.actualizarCliente(id, clienteData);
            
            return res.status(200).json({
                success: true,
                message: 'Cliente actualizado exitosamente'
            });
        } catch (error) {
            console.error('Error al actualizar cliente:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar cliente',
                error: error.message
            });
        }
    },

    async eliminarCliente(req, res) {
        try {
            const { id } = req.params;
            
            await clienteNFUService.eliminarCliente(id);
            
            return res.status(200).json({
                success: true,
                message: 'Cliente eliminado exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al eliminar cliente',
                error: error.message
            });
        }
    },

    async exportarCSV(req, res) {
        try {
            const filtros = {
                empresa: req.query.empresa || '',
                cuit: req.query.cuit || '',
            };

            // Obtener clientes con los filtros aplicados
            const clientes = await clienteNFUService.obtenerConFiltros(filtros);

            // Construir el CSV
            let csv = 'Empresa,CUIT,Correo,Teléfono,Fecha de Creación\n';
            
            clientes.forEach(cliente => {
                const empresa = (cliente.empresa || '').replace(/,/g, ';');
                const cuit = cliente.cuit || '';
                const correo = (cliente.correo || '').replace(/,/g, ';');
                const telefono = (cliente.telefono || '').replace(/,/g, ';');
                const fecha = new Date(cliente.created_at).toLocaleDateString('es-AR');
                
                csv += `"${empresa}","${cuit}","${correo}","${telefono}","${fecha}"\n`;
            });

            // Configurar headers para descarga
            const filename = `clientes_nfu_${new Date().toISOString().split('T')[0]}.csv`;
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
    },

};

module.exports = clientesNFUController;