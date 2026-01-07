-- Agregar columna es_kit a la tabla bienes
ALTER TABLE bienes 
ADD COLUMN es_kit BOOLEAN DEFAULT FALSE COMMENT 'Indica si este bien es un kit (conjunto de otros bienes)';

-- Tabla de componentes de kit (relación bien_kit -> bien_componente)
-- Un bien marcado como kit puede tener múltiples bienes componentes
CREATE TABLE IF NOT EXISTS bien_componentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bien_kit_id INT NOT NULL COMMENT 'ID del bien que es un kit',
    bien_componente_id INT NOT NULL COMMENT 'ID del bien que forma parte del kit',
    cantidad INT NOT NULL DEFAULT 1 COMMENT 'Cantidad de este componente en el kit',
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_kit_componente (bien_kit_id, bien_componente_id),
    FOREIGN KEY (bien_kit_id) REFERENCES bienes(id) ON DELETE CASCADE,
    FOREIGN KEY (bien_componente_id) REFERENCES bienes(id) ON DELETE CASCADE,
    INDEX idx_kit (bien_kit_id),
    INDEX idx_componente (bien_componente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
