-- Tabla para registrar pagos a proveedores
-- Unifica tanto pagos por recepción como pagos a contrafactura

CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orden_compra_id INT NOT NULL,
    bien_id INT NULL,  -- NULL para pagos a contrafactura completos
    proveedor_id INT NOT NULL,
    
    -- Tipo de pago: 'RECEPCION', 'ADELANTO', 'SALDO_COMPLETO'
    tipo_pago ENUM('RECEPCION', 'ADELANTO', 'SALDO_COMPLETO') NOT NULL,
    
    -- Datos del bien (solo para tipo RECEPCION)
    cantidad_recibida DECIMAL(10, 2) NULL,
    precio_unitario DECIMAL(12, 2) NULL,
    
    -- Montos
    monto_pago DECIMAL(12, 2) NOT NULL,  -- Monto de este pago específico
    monto_total DECIMAL(12, 2) NULL,     -- Monto total (para SALDO_COMPLETO)
    monto_adelanto DECIMAL(12, 2) NULL,  -- Adelanto previo (para SALDO_COMPLETO)
    
    -- Fechas
    fecha_pago DATE NOT NULL,            -- Fecha programada/real del pago
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Auditoría
    registrado_por VARCHAR(100) NOT NULL,
    
    -- Observaciones
    observaciones TEXT NULL,
    
    -- Relaciones
    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE SET NULL,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
    
    -- Índices
    INDEX idx_orden_compra (orden_compra_id),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_fecha_pago (fecha_pago),
    INDEX idx_tipo_pago (tipo_pago),
    INDEX idx_fecha_registro (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
