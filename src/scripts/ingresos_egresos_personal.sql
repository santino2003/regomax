-- Solo para instalaciones existentes: ejecutar una vez, después de personal_table.sql.
-- Conserva los movimientos anteriores. La patente es opcional para personal.
ALTER TABLE ingresos_egresos
    MODIFY COLUMN patente VARCHAR(20) NULL,
    ADD COLUMN personal_id INT NULL,
    ADD COLUMN auto VARCHAR(100) NULL,
    ADD COLUMN cargo VARCHAR(100) NULL,
    ADD COLUMN turno VARCHAR(100) NULL,
    ADD INDEX idx_movimiento_personal (personal_id),
    ADD CONSTRAINT fk_movimiento_personal FOREIGN KEY (personal_id) REFERENCES personal (id);
