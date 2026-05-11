-- Actualización para habilitar pagos múltiples con comprobante único
-- Agregar el tipo de pago MULTIPLE al enum existente

ALTER TABLE pagos
    MODIFY tipo_pago ENUM('RECEPCION', 'ADELANTO', 'SALDO_COMPLETO', 'MULTIPLE') NOT NULL;
