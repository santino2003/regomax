-- Agregar campo para permisos de transición de estados en órdenes de compra
-- Este campo almacenará un JSON con las transiciones permitidas para cada usuario

ALTER TABLE users 
ADD COLUMN permisos_transiciones_oc JSON DEFAULT NULL 
COMMENT 'Permisos de transición de estados en órdenes de compra. Formato: [{"desde": "Abierta", "hacia": "Revision"}, ...]';

-- Ejemplo de estructura del JSON:
-- [
--   {"desde": "Abierta", "hacia": "Revision"},
--   {"desde": "Revision", "hacia": "Aprobada"},
--   {"desde": "Aprobada", "hacia": "En Proceso"}
-- ]

-- Estados posibles: 
-- 'Abierta', 'Revision', 'Aprobada', 'En Proceso', 'Entregado', 'Cerrada'
