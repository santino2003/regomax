CREATE TABLE IF NOT EXISTS fallas_paradas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    minutos_afectados INT NOT NULL,
    maquina VARCHAR(255) NOT NULL,
    falla_id INT NOT NULL,
    descripcion TEXT NOT NULL,
    tipo_parada ENUM(
        'Parada',
        'Fallas',
        'Parada Programada',
        'Prueba',
        'Respuesto en planta'
    ) NOT NULL,
    observaciones TEXT NULL,
    responsable VARCHAR(255) NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_fallas_paradas_minutos CHECK (minutos_afectados >= 0),
    CONSTRAINT fk_fallas_paradas_falla FOREIGN KEY (falla_id)
        REFERENCES fallas(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
