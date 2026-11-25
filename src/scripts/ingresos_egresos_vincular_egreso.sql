-- Solo para instalaciones existentes. Ejecutar una vez antes de usar Dar egreso.
-- La columna empresa debe existir (ver ingresos_egresos_empresa.sql).
-- Cada egreso nuevo se vincula con un ingreso; la clave única impide dos salidas de la misma entrada.
-- Los egresos históricos quedan sin vínculo: no se pueden asociar automáticamente con certeza.
ALTER TABLE ingresos_egresos
    ADD COLUMN ingreso_id INT NULL,
    ADD UNIQUE KEY uq_ingresos_egresos_ingreso (ingreso_id),
    ADD CONSTRAINT fk_ingresos_egresos_ingreso FOREIGN KEY (ingreso_id) REFERENCES ingresos_egresos (id);
