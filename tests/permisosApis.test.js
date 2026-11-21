const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule, dispatch } = require('../test-support/loadModule');

const operaciones = [
  { nombre: 'consultar planificación', archivo: 'src/routes/api/planificacionRoutes.js',
    controlador: '../../controllers/planificacionController', autenticacion: '../../middleware/auth',
    prefijo: '/api/planificacion-produccion', metodo: 'GET', url: '/2026/11/21',
    accion: 'obtenerPlanificacion', permitidos: ['lectorPlanificacion'], permisos: ['dias_habiles:view'] },
  { nombre: 'guardar planificación', archivo: 'src/routes/api/planificacionRoutes.js',
    controlador: '../../controllers/planificacionController', autenticacion: '../../middleware/auth',
    prefijo: '/api/planificacion-produccion', metodo: 'POST', url: '/',
    accion: 'guardarPlanificacion', permitidos: ['editorPlanificacion'], permisos: ['dias_habiles:edit'] },
  { nombre: 'eliminar planificación', archivo: 'src/routes/api/planificacionRoutes.js',
    controlador: '../../controllers/planificacionController', autenticacion: '../../middleware/auth',
    prefijo: '/api/planificacion-produccion', metodo: 'DELETE', url: '/2026/11/21',
    accion: 'eliminarPlanificacion', permitidos: ['eliminadorPlanificacion'], permisos: ['dias_habiles:delete'] },
  { nombre: 'consultar reporte productivo', archivo: 'src/routes/reporteRoutes.js',
    controlador: '../controllers/reporteController', autenticacion: '../middleware/auth',
    prefijo: '/api/reportes', metodo: 'GET', url: '/completo',
    accion: 'generarReporteCompleto', permitidos: ['lectorReportes', 'lectorAR'], permisos: ['reportes:view', 'reportes:view_ar'] },
  { nombre: 'consultar reporte AR', archivo: 'src/routes/reporteARRoutes.js',
    controlador: '../controllers/reporteARController', autenticacion: '../middleware/auth',
    prefijo: '/api/reportear', metodo: 'GET', url: '/',
    accion: 'generarReporteAR', permitidos: ['lectorAR'], permisos: ['reportes:view_ar'] }
];

function crearContexto(operacion) {
  const cuentas = {
    administrador: { username: 'administrador', role: 'admin' },
    sinPermisos: { username: 'operador', role: 'user', permissions: {} },
    supervisor: { username: 'supervisor', role: 'supervisor', permissions: {} },
    lectorPlanificacion: { username: 'lector', role: 'user', permissions: { 'dias_habiles:view': true } },
    editorPlanificacion: { username: 'editor', role: 'user', permissions: { 'dias_habiles:edit': true } },
    eliminadorPlanificacion: { username: 'eliminador', role: 'user', permissions: { 'dias_habiles:delete': true } },
    lectorReportes: { username: 'lector-reportes', role: 'user', permissions: { 'reportes:view': true } },
    lectorAR: { username: 'lector-ar', role: 'user', permissions: { 'reportes:view_ar': true } },
    exportador: { username: 'exportador', role: 'user', permissions: { 'reportes:export': true } },
    permisosFalsos: { username: 'sin-autorizacion', role: 'user',
      permissions: Object.fromEntries(operacion.permisos.map(permiso => [permiso, false])) },
    permisosComoTexto: { username: 'permisos-invalidos', role: 'user',
      permissions: Object.fromEntries(operacion.permisos.map(permiso => [permiso, 'true'])) }
  };
  const controlador = Object.fromEntries(operaciones.map(op => [op.accion,
    mock.fn((req, res) => res.json({ success: true, accion: op.accion }))
  ]));
  // Se usan los middleware reales; la verificación criptográfica y los controladores se simulan.
  const autenticacion = loadModule('src/middleware/auth.js', {
    '../utils/hash': { verifyToken: token => cuentas[token] }
  });
  const rutas = loadModule(operacion.archivo, {
    [operacion.controlador]: controlador, [operacion.autenticacion]: autenticacion
  });
  return { cuentas, controlador,
    solicitar: token => dispatch(rutas, {
      method: operacion.metodo, url: operacion.url, originalUrl: operacion.prefijo + operacion.url,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      query: { fecha: '2026-11-21' }, body: { anio: 2026, mes: 11, dia: 21, productos: { 1: 100 } }
    })
  };
}

function comprobarQueNoSeInvocoElControlador(controlador) {
  for (const accion of Object.values(controlador)) assert.equal(accion.mock.callCount(), 0);
}

for (const operacion of operaciones) {
  test(`Permisos de API: ${operacion.nombre} exige autenticación antes de invocar el controlador`, async () => {
    const f = crearContexto(operacion);
    for (const token of [null, 'token-invalido']) {
      assert.equal((await f.solicitar(token)).status, 401);
    }
    comprobarQueNoSeInvocoElControlador(f.controlador);
  });

  for (const cuenta of ['sinPermisos', 'supervisor', 'permisosFalsos', 'permisosComoTexto']) {
    test(`Permisos de API: ${operacion.nombre} deniega el acceso a ${cuenta}`, async () => {
      const f = crearContexto(operacion);
      const respuesta = await f.solicitar(cuenta);
      assert.equal(respuesta.status, 403);
      assert.equal(respuesta.data.error, 'PERMISSION_DENIED');
      if (operacion.permisos.length === 1) assert.equal(respuesta.data.requiredPermission, operacion.permisos[0]);
      else assert.deepEqual(respuesta.data.requiredPermissions, operacion.permisos);
      comprobarQueNoSeInvocoElControlador(f.controlador);
    });
  }

  test(`Permisos de API: ${operacion.nombre} rechaza permisos de otras operaciones`, async () => {
    const f = crearContexto(operacion);
    for (const cuenta of ['lectorPlanificacion', 'editorPlanificacion', 'eliminadorPlanificacion', 'lectorReportes', 'lectorAR', 'exportador']) {
      if (!operacion.permitidos.includes(cuenta)) assert.equal((await f.solicitar(cuenta)).status, 403, cuenta);
    }
    comprobarQueNoSeInvocoElControlador(f.controlador);
  });

  for (const cuenta of [...operacion.permitidos, 'administrador']) {
    test(`Permisos de API: ${operacion.nombre} permite el acceso a ${cuenta} y conserva los datos de la solicitud`, async () => {
      const f = crearContexto(operacion);
      const respuesta = await f.solicitar(cuenta);
      assert.deepEqual(respuesta, { status: 200, data: { success: true, accion: operacion.accion } });
      assert.equal(f.controlador[operacion.accion].mock.callCount(), 1);
      const solicitud = f.controlador[operacion.accion].mock.calls[0].arguments[0];
      assert.equal(solicitud.user, f.cuentas[cuenta]);
      if (operacion.url === '/2026/11/21') {
        assert.deepEqual({ ...solicitud.params }, { anio: '2026', mes: '11', dia: '21' });
      }
      if (operacion.metodo === 'POST') {
        assert.deepEqual(solicitud.body, { anio: 2026, mes: 11, dia: 21, productos: { 1: 100 } });
      }
      if (operacion.prefijo.startsWith('/api/reporte')) assert.deepEqual(solicitud.query, { fecha: '2026-11-21' });
      for (const [nombre, accion] of Object.entries(f.controlador)) {
        if (nombre !== operacion.accion) assert.equal(accion.mock.callCount(), 0);
      }
    });
  }
}
