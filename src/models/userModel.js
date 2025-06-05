class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.password = data.password; // Esta será la contraseña hasheada
    this.email = data.email || null;
    this.role = data.role || 'user';
    
    // Manejar permisos (pueden venir como string JSON desde la BD)
    if (data.permissions) {
      if (typeof data.permissions === 'string') {
        try {
          this.permissions = JSON.parse(data.permissions);
        } catch (e) {
          this.permissions = {};
        }
      } else {
        this.permissions = data.permissions;
      }
    } else {
      this.permissions = {};
    }
    
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
  
  // Método para verificar si el usuario tiene un permiso específico
  hasPermission(permission) {
    // Admin tiene todos los permisos
    if (this.role === 'admin') return true;
    
    return this.permissions && this.permissions[permission] === true;
  }
  
  // Método para convertir a objeto plano (sin la contraseña para devolver al cliente)
  toPublicJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;