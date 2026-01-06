-- Tabla principal de ordenes de compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(20) NOT NULL UNIQUE COMMENT 'Código único OC-XXX',
    estado ENUM('Abierta', 'Revision', 'Aprobada', 'En Proceso', 'Entregado', 'Cerrada') NOT NULL DEFAULT 'Abierta',
    fecha_entrega_solicitada DATE NULL COMMENT 'Fecha solicitada de entrega',
    fecha_entrega_proveedor DATE NULL COMMENT 'Fecha comprometida por el proveedor',
    condicion ENUM('No Critica', 'Semi Critica', 'Muy Critica') NOT NULL DEFAULT 'No Critica',
    asunto TEXT NULL COMMENT 'Descripción o asunto de la orden',
    archivo_adjunto VARCHAR(255) NULL COMMENT 'Ruta del archivo adjunto',
    proveedor_id INT NULL COMMENT 'Proveedor principal de la orden',
    creado_por VARCHAR(100) NOT NULL COMMENT 'Usuario que creó la orden',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
    INDEX idx_estado (estado),
    INDEX idx_fecha_entrega_solicitada (fecha_entrega_solicitada),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de items de la orden de compra
CREATE TABLE IF NOT EXISTS ordenes_compra_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orden_compra_id INT NOT NULL COMMENT 'ID de la orden de compra',
    bien_id INT NOT NULL COMMENT 'ID del bien solicitado',
    cantidad DECIMAL(10,2) NOT NULL COMMENT 'Cantidad solicitada',
    cantidad_recibida DECIMAL(10,2) DEFAULT 0 COMMENT 'Cantidad recibida (solo editable en estado En Proceso)',
    unidad_medida_id INT NULL COMMENT 'Unidad de medida',
    proveedor_sugerido_id INT NULL COMMENT 'Proveedor sugerido para este item',
    descripcion TEXT NULL COMMENT 'Descripción adicional del item',
    centro_costo VARCHAR(100) NULL COMMENT 'Centro de costo',
    precio_unitario DECIMAL(10,2) NULL COMMENT 'Precio unitario del bien',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE RESTRICT,
    FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON DELETE SET NULL,
    FOREIGN KEY (proveedor_sugerido_id) REFERENCES proveedores(id) ON DELETE SET NULL,
    INDEX idx_orden_compra (orden_compra_id),
    INDEX idx_bien (bien_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
