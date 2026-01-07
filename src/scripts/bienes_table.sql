-- Tabla de bienes
CREATE TABLE IF NOT EXISTS bienes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo ENUM('Uso', 'Consumo') NOT NULL,
    categoria_id INT,
    familia_id INT,
    unidad_medida_id INT,
    precio DECIMAL(12, 2) DEFAULT 0.00,
    cantidad_critica INT NULL COMMENT 'Cantidad mínima para generar aviso. NULL = sin avisos',
    ubicacion VARCHAR(200),
    cantidad_stock INT DEFAULT 0 COMMENT 'Cantidad actual en stock',
    almacen_defecto_id INT,
    responsable VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo),
    INDEX idx_nombre (nombre),
    INDEX idx_tipo (tipo),
    INDEX idx_categoria (categoria_id),
    INDEX idx_familia (familia_id),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE SET NULL,
    FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON DELETE SET NULL,
    FOREIGN KEY (almacen_defecto_id) REFERENCES almacenes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de relación bienes-proveedores (un bien puede tener múltiples proveedores)
CREATE TABLE IF NOT EXISTS bienes_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bien_id INT NOT NULL,
    proveedor_id INT NOT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_bien_proveedor (bien_id, proveedor_id),
    FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE CASCADE,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de archivos adjuntos de bienes
CREATE TABLE IF NOT EXISTS bienes_archivos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bien_id INT NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100),
    tamanio INT COMMENT 'Tamaño en bytes',
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subido_por VARCHAR(100),
    FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE CASCADE,
    INDEX idx_bien_id (bien_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunos bienes de ejemplo
INSERT INTO bienes (codigo, nombre, descripcion, tipo, precio, ubicacion, cantidad_stock, responsable) VALUES
('BN-' || LPAD(FLOOR(RAND() * 999999), 6, '0'), 'Tornillo M8x20', 'Tornillo hexagonal métrico M8 longitud 20mm', 'Consumo', 5.50, 'Estantería A-12', 500, 'admin'),
('BN-' || LPAD(FLOOR(RAND() * 999999), 6, '0'), 'Martillo 500g', 'Martillo de carpintero cabo de madera 500 gramos', 'Uso', 1250.00, 'Estantería B-05', 15, 'admin'),
('BN-' || LPAD(FLOOR(RAND() * 999999), 6, '0'), 'Aceite Hidráulico 20L', 'Aceite hidráulico SAE 68 bidón 20 litros', 'Consumo', 8900.00, 'Depósito Líquidos', 8, 'admin')
ON DUPLICATE KEY UPDATE codigo=codigo;
