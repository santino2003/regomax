const express = require('express');
const router = express.Router();
const path = require('path');
const authMiddleware = require('../middleware/auth');
const noCacheMiddleware = require('../middleware/noCacheMiddleware');
const bolsonController = require('../controllers/bolsonController');
const OVController = require('../controllers/ordenDeVentaController');
const productoController = require('../controllers/productoController');
const despachoController = require('../controllers/despachoController');
const parteDiarioController = require('../controllers/parteDiarioController');
const historialController = require('../controllers/historialController');
const historialService = require('../services/historialService');

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
            
            // Formatear fecha para mostrarla más amigable
            const fecha = new Date(accion.fecha_hora);
            const fechaFormateada = `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`;
            
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
            accionesRecientes: accionesFormateadas
        });
    } catch (error) {
        console.error('Error al obtener acciones recientes:', error);
        res.render('home', { 
            username: req.user.username,
            accionesRecientes: []
        });
    }
});

// Rutas de vistas para bolsones - añadiendo noCacheMiddleware
router.get('/bolsones', [authMiddleware.verifyToken, noCacheMiddleware], bolsonController.vistaListarBolsones);
router.get('/bolsones/nuevo', [authMiddleware.verifyToken, noCacheMiddleware], bolsonController.vistaNuevoBolson);
router.get('/bolsones/exportar', [authMiddleware.verifyToken, noCacheMiddleware], bolsonController.exportarBolsones);
router.get('/bolsones/:id', [authMiddleware.verifyToken, noCacheMiddleware], bolsonController.vistaEditarBolson);

// Rutas de órdenes - añadiendo noCacheMiddleware
router.get('/ordenes', [authMiddleware.verifyToken, noCacheMiddleware], OVController.vistaListarOrdenes);
router.get('/ordenes/nueva', [authMiddleware.verifyToken, noCacheMiddleware], OVController.vistaNuevaOrden);
router.get('/ordenes/editar/:id', [authMiddleware.verifyToken, noCacheMiddleware], OVController.vistaEditarOrden);
router.get('/ordenes/:id', [authMiddleware.verifyToken, noCacheMiddleware], OVController.vistaVisualizarOrden);

// Rutas de productos
router.get('/productos/nuevo', [authMiddleware.verifyToken, noCacheMiddleware], productoController.vistaNuevoProducto);

// Rutas de despachos
router.get('/despachos/nuevo', [authMiddleware.verifyToken, noCacheMiddleware], despachoController.vistaCrearDespacho);
router.get('/despachos/orden/:ordenId', [authMiddleware.verifyToken, noCacheMiddleware], despachoController.vistaVerDespachos);
router.get('/bolsones-despachados', [authMiddleware.verifyToken, noCacheMiddleware], despachoController.vistaListarBolsonesDespachados);

// Rutas de partes diarios
router.get('/partes-diarios', [authMiddleware.verifyToken, noCacheMiddleware], parteDiarioController.vistaListarPartesDiarios);
router.get('/partes-diarios/estado/:estado', [authMiddleware.verifyToken, noCacheMiddleware], parteDiarioController.vistaListarPartesDiariosPorEstado);
router.get('/partes-diarios/nuevo', [authMiddleware.verifyToken, noCacheMiddleware], parteDiarioController.vistaNuevoParteDiario);
router.get('/partes-diarios/detalle/:id', [authMiddleware.verifyToken, noCacheMiddleware], parteDiarioController.vistaDetalleParteDiario);
router.get('/partes-diarios/:id', [authMiddleware.verifyToken, noCacheMiddleware], parteDiarioController.vistaEditarParteDiario);

// Ruta para historial de acciones
router.get('/historial', [authMiddleware.verifyToken, noCacheMiddleware], historialController.mostrarHistorial);

// Endpoint de logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

module.exports = router;