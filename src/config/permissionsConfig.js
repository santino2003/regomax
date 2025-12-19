/**
 * Configuración de permisos disponibles en la aplicación
 * Este archivo contiene una lista estructurada de todos los permisos posibles
 */

const PERMISSIONS = {
  // Permisos para usuarios
  USERS: {
    VIEW: 'users:view',
    CREATE: 'users:create',
    EDIT: 'users:edit',
    DELETE: 'users:delete',
  },
  
  // Permisos para bolsones
  BOLSONES: {
    VIEW: 'bolsones:view',
    CREATE: 'bolsones:create',
    EDIT: 'bolsones:edit',
    DELETE: 'bolsones:delete',
    EXPORT: 'bolsones:export',
  },
  
  // Permisos para despachos
  DESPACHOS: {
    VIEW: 'despachos:view',
    CREATE: 'despachos:create',
    EDIT: 'despachos:edit',
    EXPORT: 'despachos:export',
  },
  
  // Permisos para partes diarios
  PARTES_DIARIOS: {
    VIEW: 'partes_diarios:view',
    CREATE: 'partes_diarios:create',
    EDIT: 'partes_diarios:edit',
    DELETE: 'partes_diarios:delete',
    APPROVE: 'partes_diarios:approve',
  },
  
  // Permisos para órdenes de venta
  ORDENES: {
    VIEW: 'ordenes:view',
    CREATE: 'ordenes:create',
    EDIT: 'ordenes:edit',
    DELETE: 'ordenes:delete',
    EXPORT: 'ordenes:export',
  },
  
  // Permisos para productos
  PRODUCTOS: {
    CREATE: 'productos:create',
    EDIT: 'productos:edit',
    DELETE: 'productos:delete',
  },
  
  // Permisos para proveedores
  PROVEEDORES: {
    VIEW: 'proveedor:view',
    CREATE: 'proveedor:create',
    EDIT: 'proveedor:edit',
    DELETE: 'proveedor:delete',
  },
  
  // Permisos para clientes NFU
  CLIENTES_NFU: {
    VIEW: 'clientes_nfu:view',
    CREATE: 'clientes_nfu:create',
    EDIT: 'clientes_nfu:edit',
    DELETE: 'clientes_nfu:delete',
  },
  
  // Permisos para familias
  FAMILIAS: {
    VIEW: 'familia:view',
    CREATE: 'familia:create',
    EDIT: 'familia:edit',
    DELETE: 'familia:delete',
  },
  
  // Permisos para categorias
  CATEGORIAS: {
    VIEW: 'categoria:view',
    CREATE: 'categoria:create',
    EDIT: 'categoria:edit',
    DELETE: 'categoria:delete',
  },
  
  // Permisos para unidades de medida
  UNIDADES_MEDIDA: {
    VIEW: 'unidadMedida:view',
    CREATE: 'unidadMedida:create',
    EDIT: 'unidadMedida:edit',
    DELETE: 'unidadMedida:delete',
  },
  
  // Permisos para almacenes
  ALMACENES: {
    VIEW: 'almacen:view',
    CREATE: 'almacen:create',
    EDIT: 'almacen:edit',
    DELETE: 'almacen:delete',
  },
  
  // Permisos para días hábiles
  DIAS_HABILES: {
    VIEW: 'dias_habiles:view',
    EDIT: 'dias_habiles:edit',
    DELETE: 'dias_habiles:delete',
  },
  
  // Permisos para reportes
  REPORTES: {
    VIEW: 'reportes:view',
    EXPORT: 'reportes:export',
    VIEW_AR: 'reportes:view_ar', // Cambiado de 'reporteAR:view' a 'reportes:view_ar' para mejor visualización
  },
  
  // Permisos para configuración del sistema
  CONFIGURACION: {
    VIEW: 'configuracion:view',
    EDIT: 'configuracion:edit',
  },
};

// Función para obtener un array plano con todos los permisos
const getAllPermissions = () => {
  const result = [];
  Object.values(PERMISSIONS).forEach(category => {
    Object.values(category).forEach(permission => {
      result.push(permission);
    });
  });
  return result;
};

// Función para obtener los permisos agrupados por categoría
const getPermissionsByCategory = () => {
  const result = {};
  Object.keys(PERMISSIONS).forEach(category => {
    result[category] = Object.values(PERMISSIONS[category]);
  });
  return result;
};

// Función para obtener un objeto con todos los permisos en true (para admins)
const getAllPermissionsEnabled = () => {
  const result = {};
  getAllPermissions().forEach(permission => {
    result[permission] = true;
  });
  return result;
};

module.exports = {
  PERMISSIONS,
  getAllPermissions,
  getPermissionsByCategory,
  getAllPermissionsEnabled,
  getAllPermissionsByCategory: getPermissionsByCategory // Añadimos alias para compatibilidad con el controlador
};