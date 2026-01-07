-- Tabla de almacenes
CREATE TABLE IF NOT EXISTS almacenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    responsable VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunos almacenes de ejemplo
INSERT INTO almacenes (nombre, responsable) VALUES
('Almacén Principal', 'admin'),
('Almacén Secundario', 'admin'),
('Depósito', 'admin')
ON DUPLICATE KEY UPDATE nombre=nombre;
