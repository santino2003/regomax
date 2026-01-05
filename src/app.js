const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Configurar zona horaria para Argentina/Buenos Aires
process.env.TZ = process.env.TZ || 'America/Argentina/Buenos_Aires';

// Importar rutas y middleware
const authRoutes = require('./routes/authRoutes');
const bolsonRoutes = require('./routes/bolsonRoutes');
const ordenDeVentaRoutes = require('./routes/ordenDeVentaRoutes');
const despachoRoutes = require('./routes/despachoRoutes');
const parteDiarioRoutes = require('./routes/parteDiarioRoutes'); // Importamos las rutas del parte diario
const historialRoutes = require('./routes/historialRoutes');
const reporteRoutes = require('./routes/reporteRoutes'); // Importamos las rutas de reportes
const reporteARRoutes = require('./routes/reporteARRoutes'); // Importamos las rutas del reporte AR
const diasHabilesRoutes = require('./routes/diasHabilesRoutes'); // Importamos las rutas de días hábiles
const viewRoutes = require('./routes/viewRoutes');
const nfuRoutes = require('./routes/nfuRoutes'); // Importamos las rutas de NFU
const authMiddleware = require('./middleware/auth');
const permissionErrorHandler = require('./middleware/permissionErrorHandler');
const productoRoutes = require('./routes/api/productoRoutes');
const planificacionRoutes = require('./routes/api/planificacionRoutes'); // Importamos las rutas de planificación
const proveedorRoutes = require('./routes/proveedorRoutes');
const clienteNFURoutes = require('./routes/clienteNFURoutes'); // Importamos las rutas de clientes NFU
const familiaRoutes = require('./routes/familiaRoutes'); // Importamos las rutas de familias
const categoriaRoutes = require('./routes/categoriaRoutes'); // Importamos las rutas de categorias
const unidadMedidaRoutes = require('./routes/unidadMedidaRoutes'); // Importamos las rutas de unidades de medida
const almacenRoutes = require('./routes/almacenRoutes'); // Importamos las rutas de almacenes
const bienRoutes = require('./routes/bienRoutes'); // Importamos las rutas de bienes
const kitRoutes = require('./routes/kitRoutes'); // Importamos las rutas de kits
const configAlertasStockRoutes = require('./routes/configAlertasStockRoutes'); // Importamos las rutas de configuración de alertas
const salidaRoutes = require('./routes/salidaRoutes'); // Importamos las rutas de salidas
// Crear aplicación Express
const app = express();

// Configurar motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Configurar middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, '../public')));

// Servir archivos estáticos desde la carpeta src/assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Servir archivos subidos desde la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware para manejar errores de permisos
app.use(permissionErrorHandler);

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/bolsones', bolsonRoutes);
app.use('/api/ordenes', ordenDeVentaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/despachos', despachoRoutes);
app.use('/api/partes-diarios', parteDiarioRoutes); // Registramos las rutas del parte diario
app.use('/api/historial', historialRoutes);
app.use('/api/reportes', reporteRoutes); // Registramos las rutas de reportes
app.use('/api/reportear', reporteARRoutes); // Registramos las rutas del reporte AR
app.use('/api/planificacion-produccion', planificacionRoutes); // Registramos las rutas de planificación
app.use('/api/proveedores', proveedorRoutes); // Rutas para gestión de proveedores
app.use('/api/clientes-nfu', clienteNFURoutes); // Rutas para gestión de clientes NFU
app.use('/api/familias', familiaRoutes); // Rutas para gestión de familias
app.use('/api/categorias', categoriaRoutes); // Rutas para gestión de categorias
app.use('/api/unidades-medida', unidadMedidaRoutes); // Rutas para gestión de unidades de medida
app.use('/api/almacenes', almacenRoutes); // Rutas para gestión de almacenes
app.use('/api/bienes', bienRoutes); // Rutas para gestión de bienes
app.use('/api/kits', kitRoutes); // Rutas para gestión de kits
app.use('/config-alertas-stock', configAlertasStockRoutes); // Rutas para configuración de alertas

// Montar rutas de salidas - incluye tanto vistas como API
app.use('/', salidaRoutes); // Rutas para salidas de bienes/kits

// Montar rutas NFU primero - IMPORTANTE: Se montan antes de las rutas de vistas
app.use('/', nfuRoutes);

// Montar rutas de días hábiles - Se monta antes de las rutas de vistas
app.use('/', diasHabilesRoutes);

// Rutas para usuarios (tanto vista como API)
app.use('/users', authRoutes); // Para la vista de gestión de usuarios
app.use('/api/users', authRoutes); // Rutas API para operaciones CRUD de usuarios

// Rutas de vistas - se montan después de las rutas API para evitar conflictos
app.use('/', viewRoutes);

// Ruta para API verify
app.get('/api/auth/verify', authMiddleware.verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    user: {
      username: req.user.username
    }
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: err.message
  });
});

// Puerto
const PORT = process.env.PORT || 3000;

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});