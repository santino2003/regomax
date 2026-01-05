-- Tabla para registrar salidas de bienes y kits
CREATE TABLE IF NOT EXISTS salidas_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_item ENUM('bien', 'kit') NOT NULL,
    item_id INT NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_nuevo INT NOT NULL,
    responsable_salida VARCHAR(255) NOT NULL,
    usuario_sistema VARCHAR(100) NOT NULL,
    fecha_salida DATETIME DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    INDEX idx_tipo_item (tipo_item, item_id),
    INDEX idx_fecha (fecha_salida),
    INDEX idx_responsable (responsable_salida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
