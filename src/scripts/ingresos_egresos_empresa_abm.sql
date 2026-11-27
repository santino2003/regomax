-- Solo para instalaciones existentes. Ejecutar una vez después de empresas_ingresos_table.sql.
ALTER TABLE ingresos_egresos
    ADD COLUMN empresa_ingreso_id INT NULL,
    ADD INDEX idx_empresa_ingreso (empresa_ingreso_id),
    ADD CONSTRAINT fk_empresa_ingreso FOREIGN KEY (empresa_ingreso_id) REFERENCES empresas_ingresos (id);

-- Recuperar las empresas cargadas manualmente. NFU y Logística conservan sus propios datos.
INSERT INTO empresas_ingresos (nombre)
SELECT DISTINCT TRIM(m.empresa) FROM ingresos_egresos m
WHERE m.motivo IN ('Basura', 'Acero', 'Proveedor', 'Visita') AND TRIM(COALESCE(m.empresa, '')) <> ''
AND NOT EXISTS (SELECT 1 FROM empresas_ingresos e WHERE e.nombre = TRIM(m.empresa));

UPDATE ingresos_egresos m JOIN empresas_ingresos e ON e.nombre = TRIM(m.empresa)
SET m.empresa_ingreso_id = e.id
WHERE m.motivo IN ('Basura', 'Acero', 'Proveedor', 'Visita') AND m.empresa_ingreso_id IS NULL;
