-- Ejecutar una vez en instalaciones existentes con personal e ingresos ya creados.
ALTER TABLE personal ADD COLUMN descripcion TEXT NULL;
ALTER TABLE ingresos_egresos ADD COLUMN descripcion TEXT NULL;
