-- Tabla de unidades de medida de productos
CREATE TABLE IF NOT EXISTS unidades_medida (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    nombre_lindo VARCHAR(100) NOT NULL,
    responsable VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunas unidades de medida de ejemplo
INSERT INTO unidades_medida (nombre, nombre_lindo, responsable) VALUES
('kg', 'Kilogramo', 'admin'),
('lt', 'Litro', 'admin'),
('un', 'Unidad', 'admin'),
('mt', 'Metro', 'admin'),
('gr', 'Gramo', 'admin')
ON DUPLICATE KEY UPDATE nombre=nombre;
