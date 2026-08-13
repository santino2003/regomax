const maquinaService = require('../services/maquinaService');
const fallaService = require('../services/fallaService');
const { fallaParadaService, TIPOS_PARADA } = require('../services/fallaParadaService');
const fallaParadaRepository = require('../repositories/fallaParadaRepository');
const Excel = require('exceljs');
const { fechaActual, formatMySQLLocal } = require('../utils/fecha');

function obtenerFiltros(query) {
    return {
        fecha_desde: query.fecha_desde || '',
        fecha_hasta: query.fecha_hasta || '',
        maquina: query.maquina || '',
        falla_id: /^\d+$/.test(query.falla_id || '') ? query.falla_id : '',
        tipo_parada: TIPOS_PARADA.includes(query.tipo_parada) ? query.tipo_parada : ''
    };
}

function formatearFechaInput(fecha) {
    if (!fecha) return '';
    if (typeof fecha === 'string') return fecha.slice(0, 10);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function formatearHoraInput(hora) {
    if (!hora) return '';
    return String(hora).slice(0, 5);
}

module.exports = {
    async vistaListar(req, res) {
        try {
            const [maquinas, fallas] = await Promise.all([
                maquinaService.obtenerTodasSinPaginacion(),
                fallaService.obtenerTodasSinPaginacion()
            ]);

            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 50;
            const filtros = obtenerFiltros(req.query);
            const resultado = await fallaParadaService.obtenerTodos(page, limit, filtros);
            const fallasParadas = resultado.data.map((registro) => ({
                ...registro,
                fecha: formatearFechaInput(registro.fecha),
                hora: formatearHoraInput(registro.hora)
            }));

            res.render('listarFallasParadas', {
                username: req.user.username,
                fallasParadas,
                pagination: resultado.pagination,
                maquinas,
                fallas,
                tiposParada: TIPOS_PARADA,
                filtros
            });
        } catch (error) {
            console.error('Error al listar fallas/paradas:', error);
            res.status(500).render('error', {
                message: 'Error al listar fallas/paradas',
                error
            });
        }
    },

    async vistaNueva(req, res) {
        try {
            const [maquinas, fallas] = await Promise.all([
                maquinaService.obtenerTodasSinPaginacion(),
                fallaService.obtenerTodasSinPaginacion()
            ]);

            res.render('fallaParadaNueva', {
                username: req.user.username,
                maquinas,
                fallas,
                tiposParada: TIPOS_PARADA,
                modoEdicion: false,
                fallaParada: null
            });
        } catch (error) {
            console.error('Error al cargar la vista de falla/parada:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de falla/parada',
                error
            });
        }
    },

    async vistaEditar(req, res) {
        try {
            const [maquinas, fallas] = await Promise.all([
                maquinaService.obtenerTodasSinPaginacion(),
                fallaService.obtenerTodasSinPaginacion()
            ]);

            const registro = await fallaParadaService.obtenerPorId(req.params.id);
            const fallaParada = {
                ...registro,
                fecha: formatearFechaInput(registro.fecha),
                hora: formatearHoraInput(registro.hora),
                falla: registro.falla_id
            };

            res.render('fallaParadaNueva', {
                username: req.user.username,
                maquinas,
                fallas,
                tiposParada: TIPOS_PARADA,
                modoEdicion: true,
                fallaParada
            });
        } catch (error) {
            console.error('Error al cargar la edición de falla/parada:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la edición de falla/parada',
                error
            });
        }
    },

    async vistaVer(req, res) {
        try {
            const registro = await fallaParadaService.obtenerPorId(req.params.id);
            const fallaParada = {
                ...registro,
                fecha: formatearFechaInput(registro.fecha),
                hora: formatearHoraInput(registro.hora)
            };

            res.render('fallaParadaVer', {
                username: req.user.username,
                fallaParada
            });
        } catch (error) {
            res.status(404).render('error', {
                message: 'Falla / Parada no encontrada',
                error
            });
        }
    },

    async crear(req, res) {
        try {
            const resultado = await fallaParadaService.crear({
                ...req.body,
                responsable: req.user.username
            });
            return res.status(201).json(resultado);
        } catch (error) {
            console.error('Error al registrar falla/parada:', error);
            return res.status(400).json({ success: false, error: error.message || 'Error al registrar falla/parada' });
        }
    },

    async modificar(req, res) {
        try {
            const resultado = await fallaParadaService.modificar(req.params.id, req.body);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al modificar falla/parada:', error);
            const status = error.message === 'Falla / Parada no encontrada' ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message || 'Error al modificar falla/parada' });
        }
    },

    async exportarExcel(req, res) {
        try {
            const filtros = obtenerFiltros(req.query);
            const selectedIds = req.query.ids
                ? req.query.ids.split(',').map((id) => Number(id.trim())).filter((id) => Number.isInteger(id) && id > 0)
                : [];

            let registros;
            if (selectedIds.length > 0) {
                registros = await fallaParadaRepository.obtenerPorIds(selectedIds);
            } else {
                const resultado = await fallaParadaService.obtenerTodos(1, 100000, filtros);
                registros = resultado.data;
            }

            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Fallas y Paradas');
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Fecha', key: 'fecha', width: 14 },
                { header: 'Hora', key: 'hora', width: 10 },
                { header: 'Minutos afectados', key: 'minutos_afectados', width: 20 },
                { header: 'Máquina', key: 'maquina', width: 28 },
                { header: 'Falla', key: 'falla', width: 28 },
                { header: 'Tipo parada', key: 'tipo_parada', width: 22 },
                { header: 'Descripción', key: 'descripcion', width: 50 },
                { header: 'Observaciones', key: 'observaciones', width: 50 },
                { header: 'Responsable', key: 'responsable', width: 22 }
            ];

            const encabezado = worksheet.getRow(1);
            encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };

            registros.forEach((registro) => {
                worksheet.addRow({
                    id: registro.id,
                    fecha: formatearFechaInput(registro.fecha),
                    hora: formatearHoraInput(registro.hora),
                    minutos_afectados: registro.minutos_afectados,
                    maquina: registro.maquina || '',
                    falla: registro.falla_nombre || '',
                    tipo_parada: registro.tipo_parada || '',
                    descripcion: registro.descripcion || '',
                    observaciones: registro.observaciones || '',
                    responsable: registro.responsable || ''
                });
            });

            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.alignment = { vertical: 'middle', wrapText: true };
                });
            });

            const fechaArchivo = formatMySQLLocal(fechaActual()).replace(/[:\s]/g, '-');
            const seleccionInfo = selectedIds.length > 0 ? '_seleccionadas' : '';
            const filename = `fallas_paradas${seleccionInfo}_${fechaArchivo}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error al exportar fallas/paradas a Excel:', error);
            if (!res.headersSent) {
                return res.status(500).json({ success: false, error: 'Error al exportar fallas/paradas a Excel' });
            }
        }
    }
};
