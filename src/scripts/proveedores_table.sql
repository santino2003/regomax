-- Tabla para gestión de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL COMMENT 'Nombre o razón social del proveedor',
    contacto VARCHAR(255) NOT NULL COMMENT 'Nombre de la persona de contacto',
    telefono VARCHAR(50) COMMENT 'Teléfono de contacto',
    email VARCHAR(255) COMMENT 'Email del proveedor',
    direccion VARCHAR(500) COMMENT 'Dirección física del proveedor',
    web VARCHAR(255) COMMENT 'Sitio web del proveedor',
    rubro VARCHAR(255) COMMENT 'Rubro o categoría del proveedor',
    responsable VARCHAR(100) NOT NULL COMMENT 'Usuario que registró el proveedor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del registro',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización',
    INDEX idx_nombre (nombre),
    INDEX idx_rubro (rubro),
    INDEX idx_contacto (contacto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla para almacenar información de proveedores';
