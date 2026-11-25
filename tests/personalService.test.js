const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio, simularTransaccion } = require('../test-support/serviceUnit');

function contexto() {
  const { db, conexion } = simularTransaccion();
  const persona = { id: 7, nombre: 'Ana', apellido: 'García', patente: null, auto: null, cargo: 'Operaria', turno: 'Mañana', activo: 1 };
  const repositorio = { obtenerPorId: mock.fn(async () => persona), listar: mock.fn(async () => [persona]),
    guardar: mock.fn(async (datos, id) => ({ id: id || 7, ...datos })), darDeBaja: mock.fn(async () => {}) };
  const movimientos = { obtenerIngresoPersonalPendiente: mock.fn(async () => null), crear: mock.fn(async datos => ({ id: 42, ...datos })) };
  return { repositorio, movimientos, db, conexion, persona, servicio: cargarServicio('personalService', {
    '../config/db': db, '../repositories/personalRepository': repositorio, '../repositories/movimientoIngresoRepository': movimientos
  }) };
}

test('Personal: el alta no pide DNI y solo exige nombre y apellido', async () => {
  const f = contexto();
  assert.deepEqual(await f.servicio.guardar({ nombre: ' Ana ', apellido: ' García ' }), {
    id: 7, nombre: 'Ana', apellido: 'García', patente: null, auto: null, cargo: null, turno: null, activo: 1
  });
  for (const datos of [{ nombre: '', apellido: 'García' }, { nombre: 'Ana', apellido: '' }, { nombre: 'A'.repeat(101), apellido: 'García' }]) {
    await assert.rejects(f.servicio.guardar(datos), { status: 400 });
  }
  assert.equal(f.repositorio.guardar.mock.callCount(), 1);
});

test('Personal: registrar ingreso toma la identidad del padrón y conserva los datos opcionales del movimiento', async () => {
  const f = contexto();
  const movimiento = await f.servicio.registrarIngreso('7', { nombre: 'Nombre adulterado', apellido: 'Otro', patente: ' ab123cd ', auto: 'Camioneta', cargo: '', turno: 'Tarde' }, { filename: 'adjunto.pdf' });
  assert.equal(movimiento.nombre, 'Ana');
  assert.equal(movimiento.apellido, 'García');
  assert.equal(movimiento.personal_id, 7);
  assert.equal(movimiento.motivo, 'Personal');
  assert.equal(movimiento.patente, 'AB123CD');
  assert.equal(movimiento.auto, 'Camioneta');
  assert.equal(movimiento.cargo, null);
  assert.equal(movimiento.turno, 'Tarde');
  assert.equal(movimiento.archivo_jpg, '/uploads/ingresos/adjunto.pdf');
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [7, f.conexion]);
  assert.deepEqual(f.movimientos.obtenerIngresoPersonalPendiente.mock.calls[0].arguments, [7, f.conexion]);
  assert.equal(f.movimientos.crear.mock.calls[0].arguments[1], f.conexion);
  assert.equal(f.repositorio.guardar.mock.callCount(), 0);
});

test('Personal: puede ingresar a pie y los campos omitidos usan los valores del padrón', async () => {
  const f = contexto();
  const movimiento = await f.servicio.registrarIngreso(7);
  assert.equal(movimiento.patente, null);
  assert.equal(movimiento.auto, null);
  assert.equal(movimiento.cargo, 'Operaria');
  assert.equal(movimiento.turno, 'Mañana');
});

test('Personal: un ingreso sin egreso impide registrar una segunda entrada', async () => {
  const f = contexto();
  f.movimientos.obtenerIngresoPersonalPendiente.mock.mockImplementation(async () => ({ id: 42 }));
  await assert.rejects(f.servicio.registrarIngreso(7), { status: 409 });
  assert.equal(f.movimientos.crear.mock.callCount(), 0);
});

test('Personal: no se permite ingresar personal inexistente o dado de baja', async () => {
  for (const persona of [null, { activo: 0 }, { activo: '0' }]) {
    const f = contexto();
    f.repositorio.obtenerPorId.mock.mockImplementation(async () => persona);
    await assert.rejects(f.servicio.registrarIngreso(7), { status: 400 });
    assert.equal(f.movimientos.crear.mock.callCount(), 0);
  }
});

test('Personal: la baja cambia el padrón sin borrar ni modificar los movimientos', async () => {
  const f = contexto();
  await f.servicio.eliminar('7');
  assert.deepEqual(f.repositorio.darDeBaja.mock.calls[0].arguments, [7]);
  assert.equal(f.movimientos.crear.mock.callCount(), 0);
});

test('Personal: los identificadores inválidos se rechazan antes de abrir una transacción', async () => {
  const f = contexto();
  for (const id of [null, undefined, [], true, 0, -1, '01', '7 OR 1=1']) await assert.rejects(f.servicio.registrarIngreso(id), { status: 400 });
  assert.equal(f.db.withTransaction.mock.callCount(), 0);
});
