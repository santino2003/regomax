-- Migración: Cambiar relación bienes-familias de uno-a-muchos a muchos-a-muchos
-- Fecha: 2026-02-03
-- Descripción: Un bien puede tener múltiples familias

-- Paso 1: Crear tabla intermedia bienes_familias
CREATE TABLE IF NOT EXISTS bienes_familias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bien_id INT NOT NULL,
    familia_id INT NOT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_bien_familia (bien_id, familia_id),
    FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE CASCADE,
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE,
    INDEX idx_bien_id (bien_id),
    INDEX idx_familia_id (familia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paso 2: Migrar datos existentes de familia_id a la tabla intermedia
INSERT INTO bienes_familias (bien_id, familia_id)
SELECT id, familia_id 
FROM bienes 
WHERE familia_id IS NOT NULL;

-- Paso 3: Eliminar la foreign key de familia_id en bienes
-- Nota: El nombre de la FK puede variar, ajustar según tu base de datos
SET @fk_name = (
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'bienes' 
    AND COLUMN_NAME = 'familia_id' 
    AND REFERENCED_TABLE_NAME = 'familias'
    LIMIT 1
);

SET @sql = IF(@fk_name IS NOT NULL, 
    CONCAT('ALTER TABLE bienes DROP FOREIGN KEY ', @fk_name),
    'SELECT "No se encontró FK para familia_id" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Paso 4: Eliminar el índice de familia_id (si existe)
SET @idx_name = (
    SELECT INDEX_NAME 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'bienes' 
    AND COLUMN_NAME = 'familia_id'
    AND INDEX_NAME != 'PRIMARY'
    LIMIT 1
);

SET @sql = IF(@idx_name IS NOT NULL, 
    CONCAT('ALTER TABLE bienes DROP INDEX ', @idx_name),
    'SELECT "No se encontró índice para familia_id" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Paso 5: Eliminar la columna familia_id de bienes
ALTER TABLE bienes DROP COLUMN familia_id;

-- Verificación: Mostrar estadísticas de la migración
SELECT 
    'Relaciones migradas' as Descripcion,
    COUNT(*) as Total 
FROM bienes_familias
UNION ALL
SELECT 
    'Bienes totales' as Descripcion,
    COUNT(*) as Total 
FROM bienes;
