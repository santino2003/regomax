const userRepository = require('../repositories/userRepository');
const hashUtils = require('../utils/hash');

class AuthService {
  // Método para login
  async login(username, password) {
    try {
      // Buscar usuario por nombre de usuario
      const user = await userRepository.findByUsername(username);
      
      // Si no existe el usuario o la contraseña es inválida
      if (!user) {
        console.log('no user');
        throw new Error('Credenciales inválidas');
        
      }

      // Verificar contraseña
      const isPasswordValid = await hashUtils.comparePassword(password, user.password);
      console.log("password",password, user.password, isPasswordValid);
      if (!isPasswordValid) {
        console.log('invalid password');
        throw new Error('Credenciales inválidas');
        
      }

      // Generar token JWT incluyendo permisos
      const token = hashUtils.generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      });

      // Devolver usuario (sin contraseña) y token
      return {
        user: user.toPublicJSON(),
        token
      };
    } catch (error) {
      console.error('Error en el servicio de login:', error);
      throw error;
    }
  }

  // Método para registrar un nuevo usuario
  async register(userData) {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await userRepository.findByUsername(userData.username);
      if (existingUser) {
        throw new Error('El nombre de usuario ya está en uso');
      }

      // Hashear la contraseña
      const hashedPassword = await hashUtils.hashPassword(userData.password);

      // Crear usuario con contraseña hasheada y permisos
      const newUser = await userRepository.create({
        ...userData,
        password: hashedPassword,
        permissions: userData.permissions || {} // Asegurarnos de incluir los permisos
      });

      // Generar token JWT incluyendo permisos
      const token = hashUtils.generateToken({
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        permissions: newUser.permissions
      });

      // Devolver usuario (sin contraseña) y token
      return {
        user: newUser.toPublicJSON(),
        token
      };
    } catch (error) {
      console.error('Error en el servicio de registro:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();