-- Solo para instalaciones existentes de ingresos_egresos que no tengan la columna empresa.
-- Ejecutar una sola vez; las instalaciones nuevas ya la incluyen en ingresos_egresos_table.sql.
-- Se conserva el nombre de la empresa al registrar el movimiento.
-- Los movimientos anteriores quedan sin empresa: ese dato no se había guardado.
ALTER TABLE ingresos_egresos ADD COLUMN empresa VARCHAR(255) NULL;
