const familiaService = require('../services/familiaService');

const familiaController = {
    async nuevaFamilia(req, res) {
        try {
            const familiaData = req.body;
            familiaData.responsable = req.user.username;
            await familiaService.crearFamilia(familiaData);
            return res.status(201).json({
                success: true,
                message: 'Familia agregada exitosamente',
            });
        } catch (error) {
            console.error('Error al crear familia:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al crear familia' 
            });
        }
    },

    async modificarFamilia(req, res) {
        try {
            const { id } = req.params;
            const { nombre } = req.body;

            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({ error: 'El nombre de la familia es obligatorio' });
            }

            await familiaService.modificarFamilia(id, nombre.trim());
            return res.status(200).json({
                success: true,
                message: 'Familia modificada exitosamente',
            });
        } catch (error) {
            console.error('Error al modificar familia:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al modificar familia' 
            });
        }
    },
    
    async eliminarFamilia(req, res) {
        try {
            const { id } = req.params;
            await familiaService.eliminarFamilia(id);
            return res.status(200).json({
                success: true,
                message: 'Familia eliminada exitosamente',
            });
        } catch (error) {
            console.error('Error al eliminar familia:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al eliminar familia' 
            });
        }
    },

    async obtenerFamilias(req, res) {
        try {
            const familias = await familiaService.obtenerTodas();
            return res.status(200).json(familias);
        } catch (error) {
            console.error('Error al obtener familias:', error);
            return res.status(500).json({ error: 'Error al obtener familias' });
        }
    },

    // Vistas
    async vistaListarFamilias(req, res) {
        try {
            const familias = await familiaService.obtenerTodas();
            res.render('listarFamilias', {
                username: req.user.username,
                familias
            });
        } catch (error) {
            console.error('Error al listar familias:', error);
            res.status(500).render('error', {
                message: 'Error al listar familias',
                error
            });
        }
    },

    async vistaNuevaFamilia(req, res) {
        try {
            res.render('familiasNuevo', {
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al renderizar vista de nueva familia:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nueva familia',
                error
            });
        }
    },

    async vistaVerFamilia(req, res) {
        try {
            const { id } = req.params;
            const familia = await familiaService.obtenerPorId(id);
            
            if (!familia) {
                return res.status(404).render('error', {
                    message: 'Familia no encontrada',
                    username: req.user.username
                });
            }

            res.render('familiasVer', {
                username: req.user.username,
                familia
            });
        } catch (error) {
            console.error('Error al ver familia:', error);
            res.status(500).render('error', {
                message: 'Error al cargar los detalles de la familia',
                error
            });
        }
    },

    async vistaEditarFamilia(req, res) {
        try {
            const { id } = req.params;
            const familia = await familiaService.obtenerPorId(id);
            
            if (!familia) {
                return res.status(404).render('error', {
                    message: 'Familia no encontrada',
                    username: req.user.username
                });
            }

            res.render('familiasEditar', {
                username: req.user.username,
                familia
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de familia:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el formulario de edición',
                error
            });
        }
    },
};

module.exports = familiaController;