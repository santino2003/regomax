const ordenTrabajoService = require('../services/ordenTrabajoService');
const pdfOrdenTrabajoService = require('../services/pdfOrdenTrabajoService');
const userRepository = require('../repositories/userRepository');
const maquinaService = require('../services/maquinaService');

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

    async modificar(req, res) {
        try {
            const resultado = await ordenTrabajoService.modificar(req.params.id, req.body);

            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al modificar orden de trabajo:', error);
            return res.status(400).json({
                success: false,
                error: error.message || 'Error al modificar orden de trabajo'
            });
        }
    },

    async obtenerPorId(req, res) {
        try {
            const ordenTrabajo = await ordenTrabajoService.obtenerPorId(req.params.id);
            return res.status(200).json({
                success: true,
                data: ordenTrabajo
            });
        } catch (error) {
            console.error('Error al obtener orden de trabajo:', error);
            return res.status(404).json({
                success: false,
                error: error.message || 'Orden de trabajo no encontrada'
            });
        }
    },

    async obtenerTodos(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 50;
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
            const limit = parseInt(req.query.limit, 10) || 50;
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
            const [usuarios, maquinas] = await Promise.all([
                userRepository.findAll(),
                maquinaService.obtenerTodasSinPaginacion()
            ]);

            res.render('ordenesTrabajoNueva', {
                username: req.user.username,
                usuarios,
                maquinas
            });
        } catch (error) {
            console.error('Error al cargar nueva orden de trabajo:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nueva orden de trabajo',
                error
            });
        }
    },

    async vistaVer(req, res) {
        try {
            const ordenTrabajo = await ordenTrabajoService.obtenerPorId(req.params.id);

            res.render('ordenesTrabajoVer', {
                username: req.user.username,
                ordenTrabajo
            });
        } catch (error) {
            console.error('Error al ver orden de trabajo:', error);
            res.status(404).render('error', {
                message: 'Orden de trabajo no encontrada',
                error
            });
        }
    },

    async vistaImprimir(req, res) {
        try {
            const pdfDoc = await pdfOrdenTrabajoService.generarPDF(req.params.id);
            const nombreArchivo = `orden-trabajo-${req.params.id}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
            pdfDoc.pipe(res);
        } catch (error) {
            console.error('Error al imprimir orden de trabajo:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al generar PDF de orden de trabajo'
            });
        }
    },

    async vistaEditar(req, res) {
        try {
            const [ordenTrabajo, usuarios, maquinas] = await Promise.all([
                ordenTrabajoService.obtenerPorId(req.params.id),
                userRepository.findAll(),
                maquinaService.obtenerTodasSinPaginacion()
            ]);

            res.render('ordenesTrabajoEditar', {
                username: req.user.username,
                ordenTrabajo,
                usuarios,
                maquinas
            });
        } catch (error) {
            console.error('Error al editar orden de trabajo:', error);
            res.status(404).render('error', {
                message: 'Orden de trabajo no encontrada',
                error
            });
        }
    }
};

module.exports = ordenTrabajoController;
