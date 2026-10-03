-- Un registro por ingreso o egreso. Los datos personales conservan su valor al registrar el movimiento.
CREATE TABLE IF NOT EXISTS ingresos_egresos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_movimiento ENUM('INGRESO', 'EGRESO') NOT NULL,
    motivo VARCHAR(100) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    patente VARCHAR(20) NOT NULL,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fecha_movimiento (fecha_movimiento),
    INDEX idx_patente (patente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
