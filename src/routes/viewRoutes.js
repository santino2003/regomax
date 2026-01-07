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
const ordenCompraController = require('../controllers/ordenCompraController');
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
router.get('/productos', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('productos:view')
], productoController.vistaListarProductos);

router.get('/productos/nuevo', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('productos:create')
], productoController.vistaNuevoProducto);

router.get('/productos/editar/:id', [
    authMiddleware.verifyToken, 
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('productos:edit')
], productoController.vistaEditarProducto);

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

// Vista: Editar proveedor - DEBE IR ANTES de /proveedores/:id
router.get('/proveedores/editar/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('proveedor:edit')
], proveedorController.vistaEditarProveedor);

// Vista: Ver proveedor por ID - DEBE IR DESPUÉS de /proveedores/nuevo y /proveedores/editar/:id
router.get('/proveedores/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('proveedor:view')
], proveedorController.vistaVerProveedor);

// Vistas de Clientes NFU
const clienteNFUController = require('../controllers/clienteNFUController');
router.get('/clientes-nfu', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('clientes_nfu:view')
], clienteNFUController.vistaListarClientes);

router.get('/clientes-nfu/nuevo', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('clientes_nfu:create')
], clienteNFUController.vistaNuevoCliente);

router.get('/clientes-nfu/editar/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('clientes_nfu:edit')
], clienteNFUController.vistaEditarCliente);

router.get('/clientes-nfu/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('clientes_nfu:view')
], clienteNFUController.vistaVerCliente);

// Rutas de Familias
const familiaController = require('../controllers/familiaController');
router.get('/familias', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('familia:view')
], familiaController.vistaListarFamilias);

router.get('/familias/nuevo', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('familia:create')
], familiaController.vistaNuevaFamilia);

router.get('/familias/editar/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('familia:edit')
], familiaController.vistaEditarFamilia);

router.get('/familias/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('familia:view')
], familiaController.vistaVerFamilia);

// Rutas de Centros de Costo
const centroCostoController = require('../controllers/centroCostoController');
router.get('/centros-costo/listar', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('centro_costo:view')
], centroCostoController.vistaListar);

router.get('/centros-costo/nuevo-vista', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('centro_costo:create')
], centroCostoController.vistaNuevo);

router.get('/centros-costo/:id/editar', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('centro_costo:edit')
], centroCostoController.vistaEditar);

router.get('/centros-costo/:id/ver', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('centro_costo:view')
], centroCostoController.vistaVer);

// Rutas de Categorias
const categoriaController = require('../controllers/categoriaController');
router.get('/categorias', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('categoria:view')
], categoriaController.vistaListarCategorias);

router.get('/categorias/nuevo', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('categoria:create')
], categoriaController.vistaNuevaCategoria);

router.get('/categorias/editar/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('categoria:edit')
], categoriaController.vistaEditarCategoria);

router.get('/categorias/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('categoria:view')
], categoriaController.vistaVerCategoria);

// Rutas de Unidades de Medida
const unidadMedidaController = require('../controllers/unidadMedidaController');
router.get('/unidades-medida', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('unidadMedida:view')
], unidadMedidaController.vistaListarUnidadesMedida);

router.get('/unidades-medida/nuevo', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('unidadMedida:create')
], unidadMedidaController.vistaNuevaUnidadMedida);

router.get('/unidades-medida/editar/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('unidadMedida:edit')
], unidadMedidaController.vistaEditarUnidadMedida);

router.get('/unidades-medida/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('unidadMedida:view')
], unidadMedidaController.vistaVerUnidadMedida);

// Rutas de Almacenes
const almacenController = require('../controllers/almacenController');
router.get('/almacenes', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('almacen:view')
], almacenController.vistaListarAlmacenes);

router.get('/almacenes/nuevo', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('almacen:create')
], almacenController.vistaNuevoAlmacen);

router.get('/almacenes/editar/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('almacen:edit')
], almacenController.vistaEditarAlmacen);

router.get('/almacenes/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('almacen:view')
], almacenController.vistaVerAlmacen);

// Rutas de Bienes
const bienController = require('../controllers/bienController');
router.get('/bienes', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bien:view')
], bienController.vistaListarBienes);

router.get('/bienes/nuevo', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bien:create')
], bienController.vistaNuevoBien);

router.get('/bienes/editar/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bien:edit')
], bienController.vistaEditarBien);

router.get('/bienes/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bien:view')
], bienController.vistaVerBien);

// Rutas de Kits
const kitController = require('../controllers/kitController');
router.get('/kits', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bien:view')
], kitController.vistaListarKits);

router.get('/kits/nuevo', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bien:create')
], kitController.vistaNuevoKit);

router.get('/kits/editar/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bien:edit')
], kitController.vistaEditarKit);

router.get('/kits/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('bien:view')
], kitController.vistaVerKit);

// Rutas de Órdenes de Compra
router.get('/ordenes-compra', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('ordenes_compra:view')
], (req, res) => {
    res.render('listarOrdenesCompra', { username: req.user.username });
});

router.get('/ordenes-compra/nueva', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('ordenes_compra:create')
], ordenCompraController.vistaNuevaOrden);

router.get('/ordenes-compra/:id/editar', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('ordenes_compra:edit')
], ordenCompraController.vistaEditarOrden);

router.get('/ordenes-compra/:id', [
    authMiddleware.verifyToken,
    noCacheMiddleware,
    permissionsMiddleware.hasPermission('ordenes_compra:view')
], (req, res) => {
    res.render('ordenCompraDetalle', { username: req.user.username, ordenId: req.params.id });
});

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