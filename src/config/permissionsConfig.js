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
    DELETE: 'despachos:delete',
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
  },
  
  // Permisos para productos
  PRODUCTOS: {
    VIEW: 'productos:view',
    CREATE: 'productos:create',
    EDIT: 'productos:edit',
    DELETE: 'productos:delete',
  },
  
  // Permisos para reportes
  REPORTES: {
    VIEW: 'reportes:view',
    EXPORT: 'reportes:export',
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