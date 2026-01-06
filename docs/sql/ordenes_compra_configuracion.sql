-- ============================================
-- CONFIGURACIÓN DE PERMISOS PARA ÓRDENES DE COMPRA
-- ============================================

-- Agregar permisos para órdenes de compra en la tabla de permisos
-- (Ajustar según la estructura de permisos de tu proyecto)

-- Ejemplo de inserción de permisos si tienes una tabla de permisos:
-- INSERT INTO permisos (nombre, descripcion, modulo) VALUES
-- ('ordenCompra:view', 'Ver órdenes de compra', 'ordenes_compra'),
-- ('ordenCompra:create', 'Crear órdenes de compra', 'ordenes_compra'),
-- ('ordenCompra:edit', 'Editar órdenes de compra', 'ordenes_compra'),
-- ('ordenCompra:delete', 'Eliminar órdenes de compra', 'ordenes_compra');

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- Ejemplo de orden de compra
-- NOTA: Ajustar IDs según tu base de datos
/*
INSERT INTO ordenes_compra (
    codigo, estado, fecha_entrega_solicitada, condicion, asunto, creado_por
) VALUES (
    'OC-001', 
    'Abierta', 
    DATE_ADD(CURDATE(), INTERVAL 15 DAY),
    'Semi Critica',
    'Orden de compra de materiales para producción del mes',
    'admin'
);

-- Obtener el ID de la orden recién creada
SET @orden_id = LAST_INSERT_ID();

-- Agregar items de ejemplo (ajustar bien_id según tus datos)
INSERT INTO ordenes_compra_items (
    orden_compra_id, bien_id, cantidad, descripcion
) VALUES 
(@orden_id, 1, 100, 'Material urgente para línea de producción A'),
(@orden_id, 2, 50, 'Repuestos varios');
*/

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver todas las órdenes de compra con su información
SELECT 
    oc.*,
    p.nombre as proveedor_nombre,
    COUNT(DISTINCT oci.id) as total_items,
    SUM(oci.cantidad) as cantidad_total
FROM ordenes_compra oc
LEFT JOIN proveedores p ON oc.proveedor_id = p.id
LEFT JOIN ordenes_compra_items oci ON oc.id = oci.orden_compra_id
GROUP BY oc.id
ORDER BY oc.created_at DESC;

-- Ver items de una orden específica
SELECT 
    oci.*,
    b.codigo as bien_codigo,
    b.nombre as bien_nombre,
    um.nombre as unidad_medida,
    ps.nombre as proveedor_sugerido
FROM ordenes_compra_items oci
INNER JOIN bienes b ON oci.bien_id = b.id
LEFT JOIN unidades_medida um ON oci.unidad_medida_id = um.id
LEFT JOIN proveedores ps ON oci.proveedor_sugerido_id = ps.id
WHERE oci.orden_compra_id = 1;  -- Reemplazar 1 con el ID de la orden

-- Estadísticas de órdenes por estado
SELECT 
    estado,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN fecha_entrega_solicitada < CURDATE() THEN 1 END) as vencidas
FROM ordenes_compra
GROUP BY estado;

-- Órdenes con items pendientes de recibir
SELECT 
    oc.codigo,
    oc.estado,
    oci.bien_id,
    b.nombre as bien_nombre,
    oci.cantidad,
    oci.cantidad_recibida,
    (oci.cantidad - oci.cantidad_recibida) as pendiente
FROM ordenes_compra oc
INNER JOIN ordenes_compra_items oci ON oc.id = oci.orden_compra_id
INNER JOIN bienes b ON oci.bien_id = b.id
WHERE oci.cantidad_recibida < oci.cantidad
ORDER BY oc.codigo;

-- ============================================
-- MANTENIMIENTO
-- ============================================

-- Limpiar órdenes de prueba (CUIDADO EN PRODUCCIÓN)
-- DELETE FROM ordenes_compra WHERE codigo LIKE 'OC-TEST-%';

-- Ver última orden creada
SELECT * FROM ordenes_compra ORDER BY id DESC LIMIT 1;

-- ============================================
-- ÍNDICES ADICIONALES (SI SE NECESITA OPTIMIZACIÓN)
-- ============================================

-- Crear índice en fecha de creación si hay muchas órdenes
-- CREATE INDEX idx_ordenes_compra_created_at ON ordenes_compra(created_at);

-- Crear índice compuesto para consultas frecuentes
-- CREATE INDEX idx_ordenes_estado_fecha ON ordenes_compra(estado, created_at);

-- ============================================
-- TRIGGERS ÚTILES (OPCIONAL)
-- ============================================

-- Trigger para actualizar automáticamente el estado a "Entregado" 
-- cuando todos los items hayan sido recibidos completamente
DELIMITER //
CREATE TRIGGER actualizar_estado_orden_completa
AFTER UPDATE ON ordenes_compra_items
FOR EACH ROW
BEGIN
    DECLARE items_totales INT;
    DECLARE items_completos INT;
    DECLARE estado_actual VARCHAR(20);
    
    -- Obtener estado actual de la orden
    SELECT estado INTO estado_actual 
    FROM ordenes_compra 
    WHERE id = NEW.orden_compra_id;
    
    -- Solo procesar si la orden está "En Proceso"
    IF estado_actual = 'En Proceso' THEN
        -- Contar items totales
        SELECT COUNT(*) INTO items_totales
        FROM ordenes_compra_items
        WHERE orden_compra_id = NEW.orden_compra_id;
        
        -- Contar items donde cantidad recibida >= cantidad solicitada
        SELECT COUNT(*) INTO items_completos
        FROM ordenes_compra_items
        WHERE orden_compra_id = NEW.orden_compra_id
        AND cantidad_recibida >= cantidad;
        
        -- Si todos los items están completos, cambiar a "Entregado"
        IF items_totales = items_completos THEN
            UPDATE ordenes_compra 
            SET estado = 'Entregado'
            WHERE id = NEW.orden_compra_id;
        END IF;
    END IF;
END//
DELIMITER ;

-- ============================================
-- VISTAS ÚTILES (OPCIONAL)
-- ============================================

-- Vista para órdenes con información resumida
CREATE OR REPLACE VIEW vista_ordenes_compra_resumen AS
SELECT 
    oc.id,
    oc.codigo,
    oc.estado,
    oc.condicion,
    oc.fecha_entrega_solicitada,
    oc.fecha_entrega_proveedor,
    oc.creado_por,
    oc.created_at,
    p.nombre as proveedor,
    COUNT(DISTINCT oci.id) as total_items,
    SUM(oci.cantidad) as cantidad_total,
    SUM(oci.cantidad_recibida) as cantidad_recibida_total,
    CASE 
        WHEN SUM(oci.cantidad) = SUM(oci.cantidad_recibida) THEN 'Completo'
        WHEN SUM(oci.cantidad_recibida) > 0 THEN 'Parcial'
        ELSE 'Pendiente'
    END as estado_recepcion
FROM ordenes_compra oc
LEFT JOIN proveedores p ON oc.proveedor_id = p.id
LEFT JOIN ordenes_compra_items oci ON oc.id = oci.orden_compra_id
GROUP BY oc.id, oc.codigo, oc.estado, oc.condicion, oc.fecha_entrega_solicitada, 
         oc.fecha_entrega_proveedor, oc.creado_por, oc.created_at, p.nombre;

-- ============================================
-- BACKUP Y RESTORE
-- ============================================

-- Backup de órdenes de compra
-- mysqldump -u usuario -p database_name ordenes_compra ordenes_compra_items > ordenes_compra_backup.sql

-- Restore
-- mysql -u usuario -p database_name < ordenes_compra_backup.sql
