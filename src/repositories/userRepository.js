const db = require('../config/db');
const User = require('../models/userModel');

class UserRepository {
  // Buscar usuario por nombre de usuario
  async findByUsername(username) {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      // MariaDB devuelve directamente las filas sin el atributo "rows"
      if (!result || result.length === 0) {
        return null;
      }

      return new User(result[0]);
    } catch (error) {
      console.error('Error al buscar usuario por username:', error);
      throw error;
    }
  }

  // Buscar usuario por ID
  async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      if (!result || result.length === 0) {
        return null;
      }

      return new User(result[0]);
    } catch (error) {
      console.error('Error al buscar usuario por ID:', error);
      throw error;
    }
  }

  // Crear un nuevo usuario
  async create(userData) {
    try {
      const result = await db.query(
        `INSERT INTO users (username, password, email, role) 
         VALUES (?, ?, ?, ?) RETURNING *`,
        [userData.username, userData.password, userData.email, userData.role]
      );

      // Para MariaDB, necesitamos verificar el formato de la respuesta
      // Ya que algunas versiones no soportan directamente RETURNING
      if (result.insertId) {
        // Si no hay soporte para RETURNING, buscar el usuario recién creado
        const newUser = await this.findById(result.insertId);
        return newUser;
      } else if (result[0]) {
        // Si hay soporte para RETURNING
        return new User(result[0]);
      }
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();