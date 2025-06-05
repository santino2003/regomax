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
      
      // Devolver respuesta exitosa
      return res.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: result
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
      const { username, password, email, role } = req.body;
      
      // Validación básica
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre de usuario y contraseña son requeridos' 
        });
      }

      // Llamar al servicio de autenticación
      const result = await authService.register({ username, password, email, role });
      
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
  }
};

module.exports = authController;