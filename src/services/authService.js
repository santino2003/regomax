const userRepository = require('../repositories/userRepository');
const hashUtils = require('../utils/hash');

class AuthService {
  // Método para login
  async login(username, password) {
    try {
      // Buscar usuario por nombre de usuario
      const user = await userRepository.findByUsername(username);
      
      // Si no existe el usuario
      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar contraseña
      const isPasswordValid = await hashUtils.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Credenciales inválidas');
      }

      // Generar token JWT
      const token = hashUtils.generateToken(user);

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

      // Crear usuario con contraseña hasheada
      const newUser = await userRepository.create({
        ...userData,
        password: hashedPassword
      });

      // Generar token JWT
      const token = hashUtils.generateToken(newUser);

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