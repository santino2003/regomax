const ordenTrabajoService = require('../services/ordenTrabajoService');
const userRepository = require('../repositories/userRepository');

const ordenTrabajoController = {
    async crear(req, res) {
        try {
            const resultado = await ordenTrabajoService.crear({
                ...req.body,
                creado_por: req.user.username
            });

            return res.status(201).json(resultado);
        } catch (error) {
            console.error('Error al crear orden de trabajo:', error);
            return res.status(400).json({
                success: false,
                error: error.message || 'Error al crear orden de trabajo'
            });
        }
    },

    async obtenerTodos(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 50) || 50;
            const resultado = await ordenTrabajoService.obtenerTodos(page, limit);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al obtener órdenes de trabajo:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener órdenes de trabajo'
            });
        }
    },

    async vistaListar(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 50) || 50;
            const resultado = await ordenTrabajoService.obtenerTodos(page, limit);

            res.render('listarOrdenesTrabajo', {
                username: req.user.username,
                ordenesTrabajo: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar órdenes de trabajo:', error);
            res.status(500).render('error', {
                message: 'Error al listar órdenes de trabajo',
                error
            });
        }
    },

    async vistaNueva(req, res) {
        try {
            const usuarios = await userRepository.findAll();

            res.render('ordenesTrabajoNueva', {
                username: req.user.username,
                usuarios
            });
        } catch (error) {
            console.error('Error al cargar nueva orden de trabajo:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nueva orden de trabajo',
                error
            });
        }
    }
};

module.exports = ordenTrabajoController;
