CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id VARCHAR(20) PRIMARY KEY,
    fecha_pedido DATE NOT NULL,
    fecha_terminada DATE NULL,
    estado ENUM('Pendiente', 'En Proceso', 'Cerrada') NOT NULL DEFAULT 'Pendiente',
    asignado_a VARCHAR(255) NULL,
    personas_destinadas INT NULL,
    maquina VARCHAR(255) NULL,
    descripcion TEXT NOT NULL,
    mantenimiento JSON NOT NULL,
    tipo JSON NOT NULL,
    creado_por VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
