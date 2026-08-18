const ordenTrabajoService = require('../services/ordenTrabajoService');
const pdfOrdenTrabajoService = require('../services/pdfOrdenTrabajoService');
const userRepository = require('../repositories/userRepository');
const maquinaService = require('../services/maquinaService');
const ordenTrabajoRepository = require('../repositories/ordenTrabajoRepository');
const Excel = require('exceljs');
const { fechaActual, formatMySQLLocal } = require('../utils/fecha');

function obtenerFiltros(query) {
    return {
        fecha_desde: query.fecha_desde || '',
        fecha_hasta: query.fecha_hasta || '',
        maquina: query.maquina || '',
        estado: Object.prototype.hasOwnProperty.call(query, 'estado') ? query.estado : 'Pendiente'
    };
}

function formatDateExcel(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatearTipo(tipo) {
    const tipos = {
        Electrico: 'Eléctrico',
        Mecanico: 'Mecánico',
        Hidraulico: 'Hidráulico'
    };

    return tipos[tipo] || tipo || '';
}

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
            const filtros = obtenerFiltros(req.query);
            const resultado = await ordenTrabajoService.obtenerTodos(page, limit, filtros);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al obtener órdenes de trabajo:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener órdenes de trabajo'
            });
        }
    },

    async exportarExcel(req, res) {
        try {
            const filtros = obtenerFiltros(req.query);
            const selectedIds = req.query.ids
                ? req.query.ids.split(',').map((id) => id.trim()).filter(Boolean)
                : [];

            let ordenes = [];

            if (selectedIds.length > 0) {
                ordenes = await ordenTrabajoRepository.obtenerPorIds(selectedIds);
            } else {
                const resultado = await ordenTrabajoService.obtenerTodos(1, 100000, filtros);
                ordenes = resultado.data;
            }

            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Órdenes de Trabajo');

            worksheet.columns = [
                { header: 'Pedida', key: 'pedida', width: 14 },
                { header: 'Asignado a', key: 'asignado_a', width: 22 },
                { header: 'Terminada', key: 'terminada', width: 14 },
                { header: 'Estado', key: 'estado', width: 16 },
                { header: 'Mantenimiento', key: 'mantenimiento', width: 18 },
                { header: 'Tipo', key: 'tipo', width: 16 },
                { header: 'Descripción', key: 'descripcion', width: 60 },
                { header: 'Personas Destinadas', key: 'personas_destinadas', width: 20 },
                { header: 'Maquina', key: 'maquina', width: 28 }
            ];

            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4F81BD' }
            };

            ordenes.forEach((orden) => {
                worksheet.addRow({
                    pedida: formatDateExcel(orden.fecha_pedido),
                    asignado_a: orden.asignado_a || '',
                    terminada: formatDateExcel(orden.fecha_terminada),
                    estado: orden.estado || '',
                    mantenimiento: orden.mantenimiento || '',
                    tipo: formatearTipo(orden.tipo),
                    descripcion: orden.descripcion || '',
                    personas_destinadas: orden.personas_destinadas != null ? orden.personas_destinadas : '',
                    maquina: orden.maquina || ''
                });
            });

            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.alignment = { vertical: 'middle', wrapText: true };
                });
            });

            const fechaArchivo = formatMySQLLocal(fechaActual()).replace(/[:\s]/g, '-');
            const seleccionInfo = selectedIds.length > 0 ? '_seleccionadas' : '';
            const filename = `ordenes_trabajo${seleccionInfo}_${fechaArchivo}.xlsx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error al exportar órdenes de trabajo a Excel:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al exportar órdenes de trabajo a Excel',
                error: error.message
            });
        }
    },

    async vistaListar(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 50;
            const filtros = obtenerFiltros(req.query);
            const [resultado, maquinas] = await Promise.all([
                ordenTrabajoService.obtenerTodos(page, limit, filtros),
                maquinaService.obtenerTodasSinPaginacion()
            ]);

            res.render('listarOrdenesTrabajo', {
                username: req.user.username,
                ordenesTrabajo: resultado.data,
                pagination: resultado.pagination,
                maquinas,
                filtros
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
