const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const hashUtils = require('../utils/hash');
const { getAllPermissionsByCategory } = require('../config/permissionsConfig');

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
  },

  // NUEVAS FUNCIONES PARA GESTIÓN DE USUARIOS

  // Mostrar la vista de gestión de usuarios
  async viewUsers(req, res) {
    try {
      // Obtener todos los usuarios
      const users = await userRepository.findAll();
      
      // Obtener permisos agrupados por categoría
      const permissionCategories = await getAllPermissionsByCategory();
      
      // Filtrar específicamente el permiso despachos:delete si existe
      if (permissionCategories.DESPACHOS) {
        permissionCategories.DESPACHOS = permissionCategories.DESPACHOS.filter(
          permission => permission !== 'despachos:delete'
        );
      }
      
      // Renderizar la vista
      res.render('users', { 
        username: req.user.username,
        currentUser: req.user,
        users: users,
        permissionCategories: permissionCategories
      });
    } catch (error) {
      console.error('Error al cargar la vista de usuarios:', error);
      res.status(500).render('error', {
        message: 'Error al cargar la lista de usuarios',
        error: error
      });
    }
  },

  // Obtener todos los usuarios (API)
  async getAllUsers(req, res) {
    try {
      const users = await userRepository.findAll();
      
      return res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios',
        error: error.message
      });
    }
  },

  // Obtener un usuario específico (API)
  async getUser(req, res) {
    try {
      const { id } = req.params;
      const user = await userRepository.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: user.toPublicJSON()
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener usuario',
        error: error.message
      });
    }
  },

  // Actualizar un usuario (API)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, password, role, permissions } = req.body;
      
      // Verificar si el usuario existe
      const user = await userRepository.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Verificar permisos para editar usuarios
      // Solo admin puede editar otros usuarios, un usuario solo puede editarse a sí mismo
      if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para editar este usuario'
        });
      }
      
      // Si el usuario que actualiza no es admin y está intentando cambiar el rol
      if (req.user.role !== 'admin' && role && role !== user.role) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para cambiar el rol'
        });
      }
      
      // Actualizar usuario
      const updateData = {};
      if (email) updateData.email = email;
      if (password) updateData.password = await hashUtils.hashPassword(password);
      if (role && req.user.role === 'admin') updateData.role = role;
      
      const updatedUser = await userRepository.update(id, updateData);
      
      // Actualizar permisos si se proporcionan y el usuario es admin
      if (permissions && req.user.role === 'admin') {
        await userRepository.updatePermissions(id, permissions);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Usuario actualizado correctamente',
        data: updatedUser ? updatedUser.toPublicJSON() : null
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario',
        error: error.message
      });
    }
  },

  // Eliminar un usuario (API)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar si el usuario existe
      const user = await userRepository.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Solo admin puede eliminar usuarios o el propio usuario puede eliminarse
      if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para eliminar este usuario'
        });
      }
      
      // No permitir eliminar el único usuario admin
      if (user.role === 'admin') {
        const adminCount = await userRepository.countAdmins();
        if (adminCount <= 1) {
          return res.status(403).json({
            success: false,
            message: 'No se puede eliminar el único usuario administrador'
          });
        }
      }
      
      // Eliminar usuario
      await userRepository.delete(id);
      
      return res.status(200).json({
        success: true,
        message: 'Usuario eliminado correctamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario',
        error: error.message
      });
    }
  }
};

module.exports = authController;