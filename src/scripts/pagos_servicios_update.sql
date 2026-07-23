-- Actualización para registrar pagos de servicios en el listado de pagos

ALTER TABLE pagos
    MODIFY orden_compra_id INT NULL,
    MODIFY proveedor_id INT NULL,
    MODIFY tipo_pago ENUM('RECEPCION', 'ADELANTO', 'SALDO_COMPLETO', 'MULTIPLE', 'SERVICIO') NOT NULL;

ALTER TABLE pagos
    ADD COLUMN servicio_id INT NULL AFTER proveedor_id,
    ADD INDEX idx_servicio_id (servicio_id),
    ADD CONSTRAINT fk_pagos_servicio
        FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE SET NULL;
