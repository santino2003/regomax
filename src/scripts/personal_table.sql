-- Ejecutar antes de ingresos_egresos_personal.sql.
CREATE TABLE IF NOT EXISTS personal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    patente VARCHAR(20) NULL,
    auto VARCHAR(100) NULL,
    cargo VARCHAR(100) NULL,
    turno VARCHAR(100) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_personal_nombre (apellido, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
