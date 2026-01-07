-- Modificar tabla productos para agregar relación con bienes
-- Esto permite asociar un bien que se descontará automáticamente al crear un bolsón

-- Agregar columna para el bien asociado (NULLABLE porque puede no tener bien asociado)
ALTER TABLE productos 
ADD COLUMN bien_id INT NULL DEFAULT NULL,
ADD COLUMN cantidad_bien DECIMAL(10, 2) NULL DEFAULT 1.00;

-- Agregar clave foránea
ALTER TABLE productos 
ADD CONSTRAINT fk_productos_bien
FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE SET NULL;

-- Agregar índice para mejorar rendimiento
ALTER TABLE productos 
ADD INDEX idx_bien_id (bien_id);

-- Comentarios
ALTER TABLE productos MODIFY COLUMN bien_id INT NULL COMMENT 'ID del bien asociado que se descontará al crear un bolsón (opcional)';
ALTER TABLE productos MODIFY COLUMN cantidad_bien DECIMAL(10, 2) NULL DEFAULT 1.00 COMMENT 'Cantidad del bien a descontar por cada bolsón creado (por defecto 1)';
