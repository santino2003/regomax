const express = require('express');
const router = express.Router();
const path = require('path');
const authMiddleware = require('../middleware/auth');
const noCacheMiddleware = require('../middleware/noCacheMiddleware');
const permissionsMiddleware = require('../middleware/permissions');
const bolsonController = require('../controllers/bolsonController');
const OVController = require('../controllers/ordenDeVentaController');
const productoController = require('../controllers/productoController');
const despachoController = require('../controllers/despachoController');
const parteDiarioController = require('../controllers/parteDiarioController');
const historialController = require('../controllers/historialController');
const historialService = require('../services/historialService');
// Importar utilidades de fecha para compartir en todas las vistas
const fechaUtils = require('../utils/fecha');

// Middleware para hacer disponibles las utilidades de fecha en todas las vistas
router.use((req, res, next) => {
    res.locals.fechaUtils = fechaUtils;
    next();
});

// Ruta base - redirigir a login
router.get('/', (req, res) => {
    res.redirect('/login');
});

// Ruta para login
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login.html'));
});

// Ruta para home - añadiendo noCacheMiddleware y obteniendo acciones recientes
router.get('/home', [authMiddleware.verifyToken, noCacheMiddleware], async (req, res) => {
    try {
        console.log('Username en cookie:', req.user.username);
        
        // Obtener las últimas acciones usando obtenerHistorial con límite 5
        const filtros = {
            usuario: req.user.username
        };
        const resultado = await historialService.obtenerHistorial(1, 5, filtros);
        const accionesRecientes = resultado.data || [];
        
        // Formatear las acciones para mostrarlas de forma amigable
        const accionesFormateadas = accionesRecientes.map(accion => {
            // Convertir nombre de entidades a formato más legible
            const entidadFormato = accion.entidad.replace(/_/g, ' ');
            
            // Formatear fecha utilizando la utilidad de fechaUtils para zona horaria Argentina
            const fechaFormateada = fechaUtils.formatearFechaHoraLocal(accion.fecha_hora);
            
            // Crear descripción amigable según el tipo de acción
            let descripcion = '';
            switch(accion.accion) {
                case 'crear':
                    descripcion = `Creó ${entidadFormato}${accion.entidad_id ? ' #' + accion.entidad_id : ''}`;
                    break;
                case 'editar':
                    descripcion = `Editó ${entidadFormato}${accion.entidad_id ? ' #' + accion.entidad_id : ''}`;
                    break;
                case 'eliminar':
                    descripcion = `Eliminó ${entidadFormato}${accion.entidad_id ? ' #' + accion.entidad_id : ''}`;
                    break;
                case 'consultar':
                    descripcion = `Consultó ${entidadFormato}${accion.entidad_id ? ' #' + accion.entidad_id : ''}`;
                    break;
                case 'login':
                    descripcion = 'Inició sesión';
                    break;
                case 'logout':
                    descripcion = 'Cerró sesión';
                    break;
                default:
                    descripcion = `${accion.accion} ${entidadFormato}${accion.entidad_id ? ' #' + accion.entidad_id : ''}`;
            }
            
            return {
                id: accion.id,
                fecha: fechaFormateada,
                descripcion: descripcion,
                entidad: entidadFormato,
                accion: accion.accion
            };
        });
        
        res.render('home', { 
            username: req.user.username,
            user: req.user,  // Pasar el objeto de usuario completo para verificar permisos
            accionesRecientes: accionesFormateadas
        });
    } catch (error) {
        console.error('Error al obtener acciones recientes:', error);
        res.render('home', { 
            username: req.user.username,
            user: req.user,  // Pasar el objeto de usuario completo para verificar permisos
            accionesRecientes: []
        });
    }
});

// Rutas de vistas para bolsones - con verificación de permisos
router.get('/bolsones', [
    authMiddleware.verifyToken, 
    noCacheMiddleware, 
    permissionsMiddleware.hasPermission('bolsones:view')
], bolsonController.vistaListarBolsones);

router.get('/bolsones/nuevo', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bolsones:create')
], bolsonController.vistaNuevoBolson);

router.get('/bolsones/exportar', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bolsones:export')
], bolsonController.exportarBolsones);

router.get('/bolsones/:id', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bolsones:edit')
], bolsonController.vistaEditarBolson);

// Rutas de órdenes - con verificación de permisos
router.get('/ordenes', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('ordenes:view')
], OVController.vistaListarOrdenes);

router.get('/ordenes/nueva', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('ordenes:create')
], OVController.vistaNuevaOrden);

router.get('/ordenes/editar/:id', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('ordenes:edit')
], OVController.vistaEditarOrden);

// Nueva ruta para exportar órdenes a Excel - DEBE IR ANTES DE LA RUTA CON PARÁMETRO :id
router.get('/ordenes/exportar-excel', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('ordenes:export')
], OVController.exportarExcel);

// Esta ruta debe ir DESPUÉS de todas las rutas específicas de /ordenes/
router.get('/ordenes/:id', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('ordenes:view')
], OVController.vistaVisualizarOrden);

// Rutas de productos - con verificación de permisos
router.get('/productos/nuevo', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('productos:create')
], productoController.vistaNuevoProducto);

// Rutas de despachos - con verificación de permisos
router.get('/despachos/nuevo', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('despachos:create')
], despachoController.vistaCrearDespacho);

router.get('/despachos/orden/:ordenId', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('despachos:view')
], despachoController.vistaVerDespachos);

router.get('/bolsones-despachados', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('despachos:view')
], despachoController.vistaListarBolsonesDespachados);

router.get('/bolsones-despachados/exportar', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('despachos:export')
], despachoController.exportarBolsonesDespachados);

// Ruta adicional para exportar despachos sin el prefijo /api/
router.get('/despachos/exportar-despachados', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('despachos:export')
], despachoController.exportarBolsonesDespachados);

// Rutas de partes diarios - con verificación de permisos
router.get('/partes-diarios', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('partes_diarios:view')
], parteDiarioController.vistaListarPartesDiarios);

router.get('/partes-diarios/estado/:estado', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('partes_diarios:view')
], parteDiarioController.vistaListarPartesDiariosPorEstado);

router.get('/partes-diarios/nuevo', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('partes_diarios:create')
], parteDiarioController.vistaNuevoParteDiario);

router.get('/partes-diarios/detalle/:id', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('partes_diarios:view')
], parteDiarioController.vistaDetalleParteDiario);

router.get('/partes-diarios/:id', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('partes_diarios:edit')
], parteDiarioController.vistaEditarParteDiario);

// Ruta para historial de acciones - visible para todos los usuarios autenticados
router.get('/historial', [authMiddleware.verifyToken, noCacheMiddleware], historialController.mostrarHistorial);

// Rutas para NFU - Neumáticos Fuera de Uso
const nfuController = require('../controllers/nfuController');

// Ruta para listar ingresos de NFU
router.get('/nfu', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('reportes:view')
], nfuController.listarNFU);

// Ruta para formulario de nuevo ingreso de NFU
router.get('/nfu/nuevo', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('reportes:view')
], nfuController.mostrarFormularioIngresoNFU);

// Ruta para la planificación (antes días hábiles)
const diasHabilesController = require('../controllers/diasHabilesController');
router.get('/dias-habiles', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('dias_habiles:view')
], diasHabilesController.mostrarCalendario);

// Vista: Listar proveedores
const proveedorController = require('../controllers/proveedorController');
router.get('/proveedores', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('proveedor:view')
], proveedorController.vistaListarProveedores);

// Vista: Nuevo proveedor
router.get('/proveedores/nuevo', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('proveedor:create')
], proveedorController.vistaNuevoProveedor);

// Ruta para el reporte productivo (antes reporte general consolidado)
const reporteController = require('../controllers/reporteController');
router.get('/reporte-general', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasAnyPermission(['reportes:view', 'reportes:view_ar'])
], reporteController.mostrarReporteGeneral);

// Ruta para el reporte AR
const reporteARController = require('../controllers/reporteARController');
router.get('/reporte-ar', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('reportes:view_ar')
], reporteARController.mostrarReporteAR);

// Endpoint de logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

module.exports = router;