-- Tabla de familias de productos
CREATE TABLE IF NOT EXISTS familias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    responsable VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunas familias de ejemplo
INSERT INTO familias (nombre, responsable) VALUES
('Neumáticos', 'admin'),
('Herramientas', 'admin'),
('Insumos', 'admin')
ON DUPLICATE KEY UPDATE nombre=nombre;
