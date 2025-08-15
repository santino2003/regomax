const authService = require('../services/authService');

const authController = {
  // Controlador para login
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      // Validación básica
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre de usuario y contraseña son requeridos' 
        });
      }

      // Llamar al servicio de autenticación
      const result = await authService.login(username, password);
      
      // Setear cookie HttpOnly con el token
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: false, // true si usas HTTPS
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000 // 8 horas
      });
      
      // Devolver respuesta exitosa (ahora incluyendo el token)
      return res.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: { user: result.user },
        token: result.token // Incluir token en la respuesta
      });
    } catch (error) {
      // Manejar errores específicos
      if (error.message === 'Credenciales inválidas') {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }
      
      // Error genérico del servidor
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: error.message
      });
    }
  },

  // Controlador para registro
  async register(req, res) {
    try {
      const { username, password, email, role, permissions } = req.body;
      
      // Validación básica
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre de usuario y contraseña son requeridos' 
        });
      }

      // Llamar al servicio de autenticación incluyendo los permisos
      const result = await authService.register({ 
        username, 
        password, 
        email, 
        role,
        permissions // Incluimos los permisos seleccionados
      });
      
      // Devolver respuesta exitosa
      return res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: result
      });
    } catch (error) {
      // Manejar errores específicos
      if (error.message === 'El nombre de usuario ya está en uso') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      // Error genérico del servidor
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: error.message
      });
    }
  },

  // Controlador para logout
  logout(req, res) {
    try {
      // Limpiar la cookie del token
      res.clearCookie('token');
      
      return res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión',
        error: error.message
      });
    }
  },

  // Controlador para verificar estado de autenticación
  check(req, res) {
    // Este endpoint será protegido por el middleware de autenticación
    // Si llega aquí, significa que el token es válido
    return res.status(200).json({
      success: true,
      message: 'Usuario autenticado',
      user: req.user // El middleware ya asignó el usuario decodificado a req.user
    });
  }
};

module.exports = authController;