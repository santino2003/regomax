-- Ejecutar una vez para tablas existentes antes de usar esta versión.
-- El archivo se guarda en disco; la tabla conserva su URL relativa.
ALTER TABLE ingresos_egresos ADD COLUMN archivo_jpg VARCHAR(255) NULL;
