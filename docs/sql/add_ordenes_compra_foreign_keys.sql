-- ============================================
-- SCRIPT PARA AGREGAR FOREIGN KEYS OPCIONALES
-- ============================================
-- Ejecutar este script SOLO si las tablas relacionadas existen
-- (proveedores, bienes, unidades_medida)

-- ============================================
-- VERIFICAR QUE LAS TABLAS EXISTEN
-- ============================================
-- SELECT TABLE_NAME FROM information_schema.TABLES 
-- WHERE TABLE_SCHEMA = DATABASE()
-- AND TABLE_NAME IN ('proveedores', 'bienes', 'unidades_medida');

-- ============================================
-- AGREGAR FOREIGN KEY A PROVEEDORES (OPCIONAL)
-- ============================================
-- Descomentar estas líneas si la tabla proveedores existe
/*
ALTER TABLE ordenes_compra 
ADD CONSTRAINT fk_ordenes_compra_proveedor 
FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) 
ON DELETE SET NULL;

ALTER TABLE ordenes_compra_items 
ADD CONSTRAINT fk_ordenes_compra_items_proveedor_sugerido 
FOREIGN KEY (proveedor_sugerido_id) REFERENCES proveedores(id) 
ON DELETE SET NULL;
*/

-- ============================================
-- AGREGAR FOREIGN KEY A BIENES (OPCIONAL)
-- ============================================
-- Descomentar estas líneas si la tabla bienes existe
/*
ALTER TABLE ordenes_compra_items 
ADD CONSTRAINT fk_ordenes_compra_items_bien 
FOREIGN KEY (bien_id) REFERENCES bienes(id) 
ON DELETE RESTRICT;
*/

-- ============================================
-- AGREGAR FOREIGN KEY A UNIDADES_MEDIDA (OPCIONAL)
-- ============================================
-- Descomentar estas líneas si la tabla unidades_medida existe
/*
ALTER TABLE ordenes_compra_items 
ADD CONSTRAINT fk_ordenes_compra_items_unidad_medida 
FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) 
ON DELETE SET NULL;
*/

-- ============================================
-- SCRIPT COMPLETO (TODAS LAS FK)
-- ============================================
-- Si todas las tablas existen, ejecutar todo junto:
/*
ALTER TABLE ordenes_compra 
ADD CONSTRAINT fk_ordenes_compra_proveedor 
FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;

ALTER TABLE ordenes_compra_items 
ADD CONSTRAINT fk_ordenes_compra_items_proveedor_sugerido 
FOREIGN KEY (proveedor_sugerido_id) REFERENCES proveedores(id) ON DELETE SET NULL;

ALTER TABLE ordenes_compra_items 
ADD CONSTRAINT fk_ordenes_compra_items_bien 
FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE RESTRICT;

ALTER TABLE ordenes_compra_items 
ADD CONSTRAINT fk_ordenes_compra_items_unidad_medida 
FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON DELETE SET NULL;
*/

-- ============================================
-- ELIMINAR FOREIGN KEYS (SI ES NECESARIO)
-- ============================================
-- Para eliminar las foreign keys si causan problemas:
/*
ALTER TABLE ordenes_compra DROP FOREIGN KEY fk_ordenes_compra_proveedor;
ALTER TABLE ordenes_compra_items DROP FOREIGN KEY fk_ordenes_compra_items_proveedor_sugerido;
ALTER TABLE ordenes_compra_items DROP FOREIGN KEY fk_ordenes_compra_items_bien;
ALTER TABLE ordenes_compra_items DROP FOREIGN KEY fk_ordenes_compra_items_unidad_medida;
*/
