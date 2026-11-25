-- Ejecutar una vez para tablas existentes, antes de usar ingresos de Logística.
-- Las instalaciones nuevas ya incluyen estos campos en ingresos_egresos_table.sql.
ALTER TABLE ingresos_egresos
    ADD COLUMN orden_venta_id INT NULL,
    ADD INDEX idx_ingresos_orden_venta (orden_venta_id);
