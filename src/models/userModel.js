class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.password = data.password; // Esta será la contraseña hasheada
    this.email = data.email || null;
    this.role = data.role || 'user';
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
  
  // Método para convertir a objeto plano (sin la contraseña para devolver al cliente)
  toPublicJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;