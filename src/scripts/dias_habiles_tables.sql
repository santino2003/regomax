-- Crear tabla de días hábiles (registro principal)
CREATE TABLE IF NOT EXISTS dias_habiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mes INT NOT NULL,
    anio INT NOT NULL,
    cantidad INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY mes_anio_unique (mes, anio)
);

-- Crear tabla para los días hábiles seleccionados
CREATE TABLE IF NOT EXISTS dias_habiles_seleccionados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mes INT NOT NULL,
    anio INT NOT NULL,
    dia INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY dia_mes_anio_unique (dia, mes, anio)
);

-- Añadir índices para mejorar el rendimiento de las consultas
CREATE INDEX idx_dias_habiles_mes_anio ON dias_habiles (mes, anio);
CREATE INDEX idx_dias_habiles_seleccionados_mes_anio ON dias_habiles_seleccionados (mes, anio);

-- Comentarios de la tabla
ALTER TABLE dias_habiles COMMENT 'Registro de la cantidad de días hábiles por mes';
ALTER TABLE dias_habiles_seleccionados COMMENT 'Detalle de los días seleccionados como hábiles';