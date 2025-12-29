-- Script para crear tabla de configuración de alertas de stock
-- Fecha: 2025-12-29

-- Tabla para almacenar usuarios que recibirán alertas de stock crítico
CREATE TABLE IF NOT EXISTS config_alertas_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE COMMENT 'Si el usuario está activo para recibir alertas',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_alert (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Configuración de usuarios que reciben alertas de stock crítico (global para todos los bienes)';

-- Índice para búsquedas rápidas de usuarios activos
CREATE INDEX idx_alertas_activas ON config_alertas_stock(activo, user_id);
