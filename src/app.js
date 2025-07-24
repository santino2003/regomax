const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Importar rutas y middleware
const authRoutes = require('./routes/authRoutes');
const bolsonRoutes = require('./routes/bolsonRoutes');
const ordenDeVentaRoutes = require('./routes/ordenDeVentaRoutes');
const despachoRoutes = require('./routes/despachoRoutes');
const parteDiarioRoutes = require('./routes/parteDiarioRoutes'); // Importamos las rutas del parte diario
const viewRoutes = require('./routes/viewRoutes');
const authMiddleware = require('./middleware/auth');
const productoRoutes = require('./routes/api/productoRoutes');

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

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/bolsones', bolsonRoutes);
app.use('/api/ordenes', ordenDeVentaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/despachos', despachoRoutes);
app.use('/api/partes-diarios', parteDiarioRoutes); // Registramos las rutas del parte diario

// Rutas de vistas
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