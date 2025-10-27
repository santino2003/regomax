# Scripts SQL para Cliente NFU

## Orden de ejecución

Ejecuta estos scripts en el siguiente orden:

### 1. Crear tabla clientes_nfu
```bash
mysql -u tu_usuario -p tu_base_de_datos < src/scripts/clientes_nfu_table.sql
```

### 2. Agregar columna cliente_id a tabla nfu
```bash
mysql -u tu_usuario -p tu_base_de_datos < src/scripts/nfu_add_cliente_id.sql
```

## Descripción de los cambios

### clientes_nfu_table.sql
- Crea la tabla `clientes_nfu` con los campos:
  - id (auto increment)
  - empresa (nombre de la empresa)
  - cuit (único)
  - correo
  - telefono
  - created_at
  - updated_at
- Crea índices para optimizar búsquedas por empresa y CUIT

### nfu_add_cliente_id.sql
- Agrega la columna `cliente_id` a la tabla `nfu`
- Crea una foreign key con la tabla `clientes_nfu`
- Configura DELETE SET NULL (si se elimina un cliente, los NFU quedan sin cliente)
- Crea índice para optimizar consultas

## Verificación

Después de ejecutar los scripts, verifica que todo esté correcto:

```sql
-- Verificar que la tabla clientes_nfu existe
DESCRIBE clientes_nfu;

-- Verificar que la columna cliente_id existe en nfu
DESCRIBE nfu;

-- Verificar las foreign keys
SHOW CREATE TABLE nfu;
```
