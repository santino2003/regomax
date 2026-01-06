-- Modificar tabla productos para soportar múltiples bienes
-- Cambiar de bien_id individual a un array JSON de bienes con cantidades

-- Primero eliminar la foreign key (si existe)
-- MySQL no soporta IF EXISTS con DROP FOREIGN KEY, usamos procedimiento
SET @query = (
    SELECT IF(
        COUNT(*) > 0,
        'ALTER TABLE productos DROP FOREIGN KEY fk_productos_bien',
        'SELECT "Foreign key does not exist"'
    )
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'productos'
        AND CONSTRAINT_NAME = 'fk_productos_bien'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar índice (si existe)
SET @query = (
    SELECT IF(
        COUNT(*) > 0,
        'ALTER TABLE productos DROP INDEX idx_bien_id',
        'SELECT "Index does not exist"'
    )
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'productos'
        AND INDEX_NAME = 'idx_bien_id'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar columnas (si existen)
ALTER TABLE productos DROP COLUMN IF EXISTS bien_id;
ALTER TABLE productos DROP COLUMN IF EXISTS cantidad_bien;

-- Agregar nueva columna JSON para almacenar array de bienes
ALTER TABLE productos 
ADD COLUMN bienes_asociados JSON NULL DEFAULT NULL 
COMMENT 'Array JSON de bienes asociados: [{bien_id: 1, cantidad: 1.5}, {bien_id: 2, cantidad: 2}]';

-- Comentario explicativo
-- La estructura del JSON será:
-- [
--   {"bien_id": 1, "cantidad": 1.5},
--   {"bien_id": 2, "cantidad": 2.0}
-- ]
-- donde cada objeto representa un bien a descontar con su cantidad
