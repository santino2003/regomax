const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'log', () => {});
mock.method(console, 'warn', () => {});
mock.method(console, 'error', () => {});

function crearContexto(cambios = {}) {
  const eventos = [];
  const conexion = {
    beginTransaction: mock.fn(async () => { eventos.push('iniciar'); }),
    commit: mock.fn(async () => { eventos.push('confirmar'); }),
    rollback: mock.fn(async () => { eventos.push('revertir'); }),
    release: mock.fn(() => { eventos.push('liberar'); }), ...cambios.conexion
  };
  const db = { pool: { getConnection: mock.fn(async () => conexion), ...cambios.pool } };
  const orden = {
    id: 11, codigo: 'OC-011', contrafactura: true, proveedor_id: 7,
    proveedor_nombre: 'Proveedor A', items: [], ...cambios.orden
  };
  const ordenes = {
    obtenerPorId: mock.fn(async () => orden),
    obtenerProveedorDeItem: mock.fn(async () => ({
      bien_id: 10, bien_nombre: 'Correa', proveedor_sugerido_id: 7,
      proveedor_nombre: 'Proveedor A', medio_pago: 'Transferencia'
    })), ...cambios.ordenes
  };
  const precios = { obtenerPrecioProveedorBien: mock.fn(async () => ({ precio: '100', moneda: 'ARS' })), ...cambios.precios };
  const pagos = {
    registrarPagoRecepcion: mock.fn(async () => ({ id: 101 })),
    registrarAdelanto: mock.fn(async () => ({ id: 102 })),
    registrarPagoSaldoCompleto: mock.fn(async () => ({ id: 103 })),
    eliminarPagosContrafactura: mock.fn(async () => ({ affectedRows: 2 })),
    obtenerPagosPorOrden: mock.fn(async () => []), obtenerResumenPorFecha: mock.fn(async () => []),
    obtenerTotalAdelantos: mock.fn(async () => 0),
    obtenerPagosContrafacturaPorOrden: mock.fn(async () => ({ adelantos: [], saldos: [], todos: [] })),
    obtenerPorId: mock.fn(async () => ({ id: 9, pagado: 0, monto_pago: '100' })),
    refinanciarPagoVariable: mock.fn(async (id, original, cuotas) => ({
      pagoOriginalEliminado: id, cuotasCreadas: cuotas.map((cuota, indice) => ({ id: 201 + indice, ...cuota })),
      totalRefinanciado: cuotas.reduce((total, cuota) => total + parseFloat(cuota.monto), 0)
    })),
    obtenerPagosPorIds: mock.fn(async () => [pagoMultiple(1), pagoMultiple(2)]),
    registrarPagoMultiple: mock.fn(async () => { eventos.push('registrar'); return { id: 104 }; }),
    marcarComoPagado: mock.fn(async () => { eventos.push('marcar nuevo'); }),
    marcarComoPagadoMultiple: mock.fn(async () => { eventos.push('marcar originales'); }),
    ...cambios.pagos
  };
  const jueves = new Date('2026-11-26T12:00:00Z');
  const fechas = {
    calcularJuevesProximaSemana: mock.fn(() => jueves),
    formatMySQLLocal: mock.fn(fecha => fecha === jueves ? '2026-11-26 00:00:00' : '2026-11-21 12:00:00')
  };
  return { orden, ordenes, precios, pagos, conexion, db, fechas, eventos,
    servicio: cargarServicio('pagosService', {
      '../repositories/ordenCompraRepository': ordenes, '../repositories/bienProveedorRepository': precios,
      '../repositories/pagoRepository': pagos, '../config/db': db, '../utils/fecha': fechas
    })
  };
}

function datosAdelanto(cambios = {}) {
  return { ordenId: 11, montoAdelanto: 100, fechaPago: '2026-11-26', username: 'operador', ...cambios };
}

function datosSaldo(cambios = {}) {
  return { ordenId: 11, montoTotal: 400, montoAdelanto: 100, fechaPago: '2026-11-26', username: 'operador', ...cambios };
}

function datosCuota(cambios = {}) {
  return { ordenId: 11, numeroCuota: 2, monto: 100, fechaPago: '2026-11-26', username: 'operador', ...cambios };
}

function item(cambios = {}) {
  return { bien_id: 10, bien_nombre: 'Correa', proveedor_sugerido_id: 7,
    proveedor_sugerido_nombre: 'Proveedor A', cantidad: 1, medio_pago: 'Transferencia', ...cambios };
}

function pagoMultiple(id, cambios = {}) {
  return { id, orden_compra_id: 11, orden_codigo: 'OC-011', proveedor_id: 7, moneda: 'ARS',
    medio_pago: 'Transferencia', pagado: 0, monto_pago: '50', bien_nombre: 'Correa', bien_codigo: 'C-10', ...cambios };
}

test('Pagos: la clave de agrupación distingue proveedor y medio de pago y admite valores ausentes', () => {
  const f = crearContexto();
  assert.equal(f.servicio.obtenerClaveProveedorMedio(7, 'Transferencia'), '7::Transferencia');
  assert.notEqual(f.servicio.obtenerClaveProveedorMedio(7, 'Efectivo'), f.servicio.obtenerClaveProveedorMedio(7, 'Transferencia'));
  assert.equal(f.servicio.obtenerClaveProveedorMedio(null, undefined), '::');
});

test('Pagos: una recepción calcula el importe y programa el pago con los datos del proveedor', async () => {
  const f = crearContexto({ precios: { obtenerPrecioProveedorBien: mock.fn(async () => ({ precio: '12.50', moneda: 'USD' })) } });
  const resultado = await f.servicio.registrarPagoPorRecepcion(11, 4, 3, 'operador');
  assert.deepEqual(f.ordenes.obtenerProveedorDeItem.mock.calls[0].arguments, [11, 4]);
  assert.deepEqual(f.precios.obtenerPrecioProveedorBien.mock.calls[0].arguments, [10, 7]);
  assert.deepEqual(f.pagos.registrarPagoRecepcion.mock.calls[0].arguments, [{
    ordenCompraId: 11, bienId: 10, proveedorId: 7, cantidadRecibida: 3, precioUnitario: 12.5,
    montoPago: 37.5, fechaPago: '2026-11-26', registradoPor: 'operador',
    observaciones: 'Pago por recepción de 3 unidades de "Correa"', moneda: 'USD', medioPago: 'Transferencia'
  }]);
  assert.deepEqual(resultado, {
    success: true, message: '✓ Pago informado: $37.50 (3 × $12.50)', data: {
      pagoId: 101, bienNombre: 'Correa', proveedorNombre: 'Proveedor A', cantidadRecibida: 3,
      precioUnitario: 12.5, montoTotal: 37.5, fechaPago: '2026-11-26'
    }
  });
  assert.ok(f.fechas.calcularJuevesProximaSemana.mock.calls[0].arguments[0] instanceof Date);
});

test('Pagos: una recepción sin moneda ni medio de pago usa ARS y null', async () => {
  const f = crearContexto({
    ordenes: { obtenerProveedorDeItem: mock.fn(async () => ({ bien_id: 10, bien_nombre: 'Correa', proveedor_sugerido_id: 7 })) },
    precios: { obtenerPrecioProveedorBien: mock.fn(async () => ({ precio: 10 })) }
  });
  await f.servicio.registrarPagoPorRecepcion(11, 4, 2, 'operador');
  const datos = f.pagos.registrarPagoRecepcion.mock.calls[0].arguments[0];
  assert.equal(datos.moneda, 'ARS');
  assert.equal(datos.medioPago, null);
});

test('Pagos: una recepción con ítem inexistente no consulta precios ni registra pagos', async () => {
  const f = crearContexto({ ordenes: { obtenerProveedorDeItem: mock.fn(async () => null) } });
  assert.deepEqual(await f.servicio.registrarPagoPorRecepcion(11, 4, 2, 'operador'), {
    success: false, message: 'No se encontró el item en la orden de compra'
  });
  assert.equal(f.precios.obtenerPrecioProveedorBien.mock.callCount(), 0);
  assert.equal(f.pagos.registrarPagoRecepcion.mock.callCount(), 0);
});

test('Pagos: una recepción sin proveedor solicita pago manual y no consulta precios', async () => {
  const f = crearContexto({ ordenes: { obtenerProveedorDeItem: mock.fn(async () => ({ bien_nombre: 'Correa' })) } });
  assert.deepEqual(await f.servicio.registrarPagoPorRecepcion(11, 4, 2, 'operador'), {
    success: false, warning: true, requiresManualPayment: true,
    message: '⚠️ El item "Correa" no tiene proveedor sugerido asignado. No se informará a pagos automáticamente.'
  });
  assert.equal(f.precios.obtenerPrecioProveedorBien.mock.callCount(), 0);
  assert.equal(f.pagos.registrarPagoRecepcion.mock.callCount(), 0);
});

for (const precio of [null, { precio: 0 }, {}]) {
  test(`Pagos: una recepción sin precio utilizable (${JSON.stringify(precio)}) solicita pago manual`, async () => {
    const f = crearContexto({ precios: { obtenerPrecioProveedorBien: mock.fn(async () => precio) } });
    assert.deepEqual(await f.servicio.registrarPagoPorRecepcion(11, 4, 2, 'operador'), {
      success: false, warning: true, requiresManualPayment: true,
      message: '⚠️ El proveedor "Proveedor A" no tiene precio configurado para el bien "Correa". No se informará a pagos.'
    });
    assert.equal(f.pagos.registrarPagoRecepcion.mock.callCount(), 0);
  });
}

test('Pagos: una falla al consultar el precio de recepción se devuelve como advertencia', async () => {
  const f = crearContexto({ precios: { obtenerPrecioProveedorBien: mock.fn(async () => { throw new Error('Falla simulada'); }) } });
  assert.deepEqual(await f.servicio.registrarPagoPorRecepcion(11, 4, 2, 'operador'), {
    success: false, warning: true, requiresManualPayment: true,
    message: '⚠️ Error al consultar precio del proveedor "Proveedor A". No se informará a pagos.'
  });
  assert.equal(f.pagos.registrarPagoRecepcion.mock.callCount(), 0);
});

const operacionesContrafactura = [
  { metodo: 'registrarAdelanto', datos: datosAdelanto, monto: 'montoAdelanto', registro: 'registrarAdelanto',
    campos: ['ordenId', 'montoAdelanto', 'fechaPago'], faltantes: 'Faltan datos requeridos para registrar el adelanto',
    negativo: 'El monto del adelanto debe ser mayor a 0', prohibido: 'Solo se pueden registrar adelantos para órdenes a contrafactura',
    sinProveedores: 'La orden no tiene proveedores asignados. Asigne un proveedor a la orden o a sus items para registrar el adelanto.' },
  { metodo: 'registrarPagoSaldoCompleto', datos: datosSaldo, monto: 'montoTotal', registro: 'registrarPagoSaldoCompleto',
    campos: ['ordenId', 'montoTotal', 'fechaPago'], faltantes: 'Faltan datos requeridos para registrar el pago',
    negativo: 'El monto total debe ser mayor a 0', prohibido: 'Solo se pueden registrar pagos completos para órdenes a contrafactura',
    sinProveedores: 'La orden no tiene proveedores asignados. Asigne un proveedor a la orden o a sus items para registrar el pago.' },
  { metodo: 'registrarCuotaOrdenCompra', datos: datosCuota, monto: 'monto', registro: 'registrarPagoSaldoCompleto',
    campos: ['ordenId', 'numeroCuota', 'monto', 'fechaPago'], faltantes: 'Faltan datos requeridos para registrar la cuota',
    negativo: 'El monto de la cuota debe ser mayor a 0', prohibido: 'Solo se pueden registrar cuotas para órdenes a contrafactura',
    sinProveedores: 'La orden no tiene proveedores asignados. Asigne un proveedor a la orden o a sus items para registrar la cuota.' }
];

for (const caso of operacionesContrafactura) {
  for (const campo of caso.campos) {
    test(`Pagos: ${caso.metodo} rechaza la ausencia de ${campo} antes de consultar la orden`, async () => {
      const f = crearContexto();
      await assert.rejects(f.servicio[caso.metodo](caso.datos({ [campo]: null })), { message: caso.faltantes });
      assert.equal(f.ordenes.obtenerPorId.mock.callCount(), 0);
      assert.equal(f.pagos[caso.registro].mock.callCount(), 0);
    });
  }
  test(`Pagos: ${caso.metodo} rechaza un importe negativo`, async () => {
    const f = crearContexto();
    await assert.rejects(f.servicio[caso.metodo](caso.datos({ [caso.monto]: -1 })), { message: caso.negativo });
    assert.equal(f.ordenes.obtenerPorId.mock.callCount(), 0);
  });
  test(`Pagos: ${caso.metodo} rechaza una orden inexistente`, async () => {
    const f = crearContexto({ ordenes: { obtenerPorId: mock.fn(async () => null) } });
    await assert.rejects(f.servicio[caso.metodo](caso.datos()), { message: 'Orden de compra no encontrada' });
    assert.equal(f.pagos[caso.registro].mock.callCount(), 0);
  });
  test(`Pagos: ${caso.metodo} requiere una orden a contrafactura`, async () => {
    const f = crearContexto({ orden: { contrafactura: false } });
    await assert.rejects(f.servicio[caso.metodo](caso.datos()), { message: caso.prohibido });
    assert.equal(f.pagos[caso.registro].mock.callCount(), 0);
  });
  test(`Pagos: ${caso.metodo} rechaza órdenes sin proveedores asignados`, async () => {
    const f = crearContexto({ orden: { proveedor_id: null, items: [item({ proveedor_sugerido_id: null })] } });
    await assert.rejects(f.servicio[caso.metodo](caso.datos()), { message: caso.sinProveedores });
    assert.equal(f.pagos[caso.registro].mock.callCount(), 0);
  });
  test(`Pagos: ${caso.metodo} usa el proveedor principal cuando la orden no tiene ítems`, async () => {
    const f = crearContexto();
    const resultado = await f.servicio[caso.metodo](caso.datos());
    const datos = f.pagos[caso.registro].mock.calls[0].arguments[0];
    assert.equal(resultado.success, true);
    assert.equal(datos.proveedorId, 7);
    assert.equal(datos.ordenCompraId, 11);
    assert.equal(datos.moneda, 'ARS');
    assert.equal(datos.medioPago, null);
    assert.equal(datos.fechaPago, '2026-11-26');
    assert.equal(datos.registradoPor, 'operador');
    assert.equal(f.precios.obtenerPrecioProveedorBien.mock.callCount(), 0);
  });
  test(`Pagos: ${caso.metodo} conserva separados los medios de pago del mismo proveedor`, async () => {
    const f = crearContexto({ orden: { items: [item(), item({ cantidad: 3, medio_pago: 'Efectivo' })] } });
    await f.servicio[caso.metodo](caso.datos());
    const registros = f.pagos[caso.registro].mock.calls.map(c => c.arguments[0]);
    assert.equal(registros.length, 2);
    assert.deepEqual(registros.map(r => r.proveedorId), [7, 7]);
    assert.deepEqual(registros.map(r => r.medioPago), ['Transferencia', 'Efectivo']);
    if (caso.metodo === 'registrarAdelanto') assert.deepEqual(registros.map(r => r.montoAdelanto), [25, 75]);
    else assert.deepEqual(registros.map(r => r.saldoAPagar), caso.metodo === 'registrarPagoSaldoCompleto' ? [75, 225] : [25, 75]);
  });
  test(`Pagos: ${caso.metodo} reparte el importe equitativamente cuando no hay precios`, async () => {
    const f = crearContexto({
      orden: { items: [item(), item({ proveedor_sugerido_id: 8, proveedor_sugerido_nombre: 'Proveedor B' })] },
      precios: { obtenerPrecioProveedorBien: mock.fn(async () => null) }
    });
    await f.servicio[caso.metodo](caso.datos());
    const registros = f.pagos[caso.registro].mock.calls.map(c => c.arguments[0]);
    assert.deepEqual(registros.map(r => r.proveedorId), [7, 8]);
    if (caso.metodo === 'registrarAdelanto') assert.deepEqual(registros.map(r => r.montoAdelanto), [50, 50]);
    else assert.deepEqual(registros.map(r => r.saldoAPagar), caso.metodo === 'registrarPagoSaldoCompleto' ? [150, 150] : [50, 50]);
  });
}

test('Pagos: un adelanto agrupa ítems y distribuye el monto proporcionalmente entre proveedores', async () => {
  const f = crearContexto({ orden: { items: [item(), item({ bien_id: 11 }),
    item({ proveedor_sugerido_id: 8, proveedor_sugerido_nombre: 'Proveedor B', cantidad: 6 })] } });
  const resultado = await f.servicio.registrarAdelanto(datosAdelanto({ montoAdelanto: 200 }));
  const registros = f.pagos.registrarAdelanto.mock.calls.map(c => c.arguments[0]);
  assert.deepEqual(registros.map(r => [r.proveedorId, r.montoAdelanto]), [[7, 50], [8, 150]]);
  assert.equal(resultado.data.totalAdelantos, 2);
  assert.equal(resultado.data.montoTotal, 200);
  assert.deepEqual(resultado.data.adelantos.map(a => [a.cantidadItems, a.montoItemsProveedor]), [[2, 200], [1, 600]]);
});

for (const caso of [operacionesContrafactura[0], operacionesContrafactura[2]]) {
  test(`Pagos: ${caso.metodo} aprovecha la orden y la conexión recibidas`, async () => {
    const f = crearContexto();
    await f.servicio[caso.metodo](caso.datos({ ordenContext: f.orden, transactionConnection: f.conexion }));
    assert.equal(f.ordenes.obtenerPorId.mock.callCount(), 0);
    assert.equal(f.pagos[caso.registro].mock.calls[0].arguments[0].connection, f.conexion);
  });
  test(`Pagos: ${caso.metodo} filtra los importes por la moneda solicitada`, async () => {
    const f = crearContexto({
      orden: { items: [item(), item({ bien_id: 11, proveedor_sugerido_id: 8 })] },
      precios: { obtenerPrecioProveedorBien: mock.fn(async id => ({ precio: 100, moneda: id === 10 ? 'USD' : 'ARS' })) }
    });
    await f.servicio[caso.metodo](caso.datos({ monedaObjetivo: 'usd' }));
    assert.equal(f.pagos[caso.registro].mock.callCount(), 1);
    const datos = f.pagos[caso.registro].mock.calls[0].arguments[0];
    assert.equal(datos.proveedorId, 7);
    assert.equal(datos.moneda, 'USD');
    assert.equal(caso.metodo === 'registrarAdelanto' ? datos.montoAdelanto : datos.saldoAPagar, 100);
  });
  test(`Pagos: ${caso.metodo} rechaza una moneda que no tiene ítems`, async () => {
    const f = crearContexto({ orden: { items: [item()] } });
    await assert.rejects(f.servicio[caso.metodo](caso.datos({ monedaObjetivo: 'USD' })), {
      message: `No se encontraron items con moneda USD para registrar ${caso.metodo === 'registrarAdelanto' ? 'el adelanto' : 'la cuota'}`
    });
    assert.equal(f.pagos[caso.registro].mock.callCount(), 0);
  });
}

test('Pagos: el saldo completo rechaza un adelanto mayor al total antes de registrar', async () => {
  const f = crearContexto();
  await assert.rejects(f.servicio.registrarPagoSaldoCompleto(datosSaldo({ montoAdelanto: 401 })), {
    message: 'El adelanto no puede ser mayor al monto total'
  });
  assert.equal(f.pagos.registrarPagoSaldoCompleto.mock.callCount(), 0);
});

test('Pagos: el saldo completo permite omitir el adelanto y conserva los totales calculados', async () => {
  const f = crearContexto();
  const resultado = await f.servicio.registrarPagoSaldoCompleto(datosSaldo({ montoAdelanto: undefined }));
  const datos = f.pagos.registrarPagoSaldoCompleto.mock.calls[0].arguments[0];
  assert.equal(datos.montoTotal, 400);
  assert.equal(datos.montoAdelanto, 0);
  assert.equal(datos.saldoAPagar, 400);
  assert.equal(resultado.data.saldoAPagar, 400);
});

test('Pagos: la cuota conserva las observaciones manuales y devuelve su número e importe', async () => {
  const f = crearContexto();
  const resultado = await f.servicio.registrarCuotaOrdenCompra(datosCuota({ observaciones: 'Segunda entrega' }));
  const datos = f.pagos.registrarPagoSaldoCompleto.mock.calls[0].arguments[0];
  assert.equal(datos.observaciones, 'Segunda entrega');
  assert.equal(datos.montoTotal, 100);
  assert.equal(datos.montoAdelanto, 0);
  assert.equal(datos.saldoAPagar, 100);
  assert.deepEqual(resultado.data, {
    ordenCodigo: 'OC-011', numeroCuota: 2, totalCuotas: 1, montoTotal: 100, fechaPago: '2026-11-26',
    cuotas: [{ pagoId: 103, proveedorNombre: 'Proveedor A', montoCuota: 100 }]
  });
});

test('Pagos: un error de precio en contrafactura permite distribuir el adelanto sin interrumpir el registro', async () => {
  const f = crearContexto({ orden: { items: [item()] },
    precios: { obtenerPrecioProveedorBien: mock.fn(async () => { throw new Error('Falla simulada'); }) } });
  assert.equal((await f.servicio.registrarAdelanto(datosAdelanto())).success, true);
  assert.equal(f.pagos.registrarAdelanto.mock.calls[0].arguments[0].montoAdelanto, 100);
});

test('Pagos: un ítem sin proveedor sugerido utiliza el proveedor principal de la orden', async () => {
  const f = crearContexto({ orden: { items: [item({ proveedor_sugerido_id: null, proveedor_sugerido_nombre: null })] } });
  await f.servicio.registrarAdelanto(datosAdelanto());
  assert.deepEqual(f.precios.obtenerPrecioProveedorBien.mock.calls[0].arguments, [10, 7]);
  assert.equal(f.pagos.registrarAdelanto.mock.calls[0].arguments[0].proveedorId, 7);
});

test('Pagos: eliminar contrafactura conserva la conexión recibida y el resultado', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.eliminarPagosContrafactura(11, f.conexion), {
    success: true, message: 'Pagos de contrafactura eliminados exitosamente', data: { affectedRows: 2 }
  });
  await f.servicio.eliminarPagosContrafactura(12);
  assert.deepEqual(f.pagos.eliminarPagosContrafactura.mock.calls.map(c => c.arguments), [[11, f.conexion], [12, null]]);
});

for (const caso of [
  { metodo: 'obtenerPagosPorOrden', argumentos: [11], resultado: [{ id: 9 }] },
  { metodo: 'obtenerResumenPorFecha', argumentos: ['2026-11-01', '2026-11-30'], resultado: [{ total: 100 }] },
  { metodo: 'obtenerTotalAdelantos', argumentos: [11], resultado: 100 }
]) {
  test(`Pagos: ${caso.metodo} conserva sus filtros y el resultado del repositorio`, async () => {
    const f = crearContexto({ pagos: { [caso.metodo]: mock.fn(async () => caso.resultado) } });
    assert.equal(await f.servicio[caso.metodo](...caso.argumentos), caso.resultado);
    assert.deepEqual(f.pagos[caso.metodo].mock.calls[0].arguments, caso.argumentos);
  });
}

for (const caso of [
  { metodo: 'actualizarOCrearAdelanto', registro: 'registrarAdelanto', datos: datosAdelanto,
    existentes: { adelantos: [{ monto_pago: '40', fecha_pago: '2026-11-26' }, { monto_pago: '60', fecha_pago: '2026-11-26' }], saldos: [] },
    cambio: { montoAdelanto: 120 }, mensaje: 'Adelantos sin cambios' },
  { metodo: 'actualizarOCrearSaldoCompleto', registro: 'registrarPagoSaldoCompleto', datos: datosSaldo,
    existentes: { adelantos: [], saldos: [{ monto_total: '100', monto_adelanto: '25', fecha_pago: '2026-11-26' },
      { monto_total: '300', monto_adelanto: '75', fecha_pago: '2026-11-26' }] },
    cambio: { montoTotal: 500 }, mensaje: 'Saldos completos sin cambios' }
]) {
  test(`Pagos: ${caso.metodo} evita registrar nuevamente importes y fechas sin cambios`, async () => {
    const f = crearContexto({ pagos: { obtenerPagosContrafacturaPorOrden: mock.fn(async () => caso.existentes) } });
    const registrar = mock.method(f.servicio, caso.registro, async () => ({ success: true }));
    assert.deepEqual(await f.servicio[caso.metodo](caso.datos()), { success: true, message: caso.mensaje, updated: false });
    assert.deepEqual(f.pagos.obtenerPagosContrafacturaPorOrden.mock.calls[0].arguments, [11]);
    assert.equal(registrar.mock.callCount(), 0);
  });
  for (const cambio of [caso.cambio, { fechaPago: '2026-11-27' }]) {
    test(`Pagos: ${caso.metodo} informa la actualización al cambiar ${Object.keys(cambio)[0]}`, async () => {
      const f = crearContexto({ pagos: { obtenerPagosContrafacturaPorOrden: mock.fn(async () => caso.existentes) } });
      const registrar = mock.method(f.servicio, caso.registro, async () => ({ success: true, data: { id: 5 } }));
      const datos = caso.datos(cambio);
      assert.deepEqual(await f.servicio[caso.metodo](datos), { success: true, data: { id: 5 }, updated: true, shouldDelete: true });
      assert.deepEqual(registrar.mock.calls[0].arguments, [datos]);
      assert.equal(f.pagos.eliminarPagosContrafactura.mock.callCount(), 0);
    });
  }
  test(`Pagos: ${caso.metodo} crea el registro cuando no hay pagos anteriores`, async () => {
    const f = crearContexto();
    const registrar = mock.method(f.servicio, caso.registro, async () => ({ success: true }));
    assert.deepEqual(await f.servicio[caso.metodo](caso.datos()), { success: true, updated: true, shouldDelete: false });
    assert.equal(registrar.mock.callCount(), 1);
  });
}

test('Pagos: actualizar contrafactura normaliza fechas y evita escribir si no hubo cambios', async () => {
  const f = crearContexto({ pagos: { obtenerPagosContrafacturaPorOrden: mock.fn(async () => ({
    adelantos: [{ monto_pago: '100', fecha_pago: new Date('2026-11-21T12:00:00Z') }],
    saldos: [{ monto_total: '400', monto_adelanto: '100', fecha_pago: '2026-11-26 08:00:00' }], todos: [{ id: 1 }, { id: 2 }]
  })) } });
  const adelanto = mock.method(f.servicio, 'registrarAdelanto', async () => ({}));
  const saldo = mock.method(f.servicio, 'registrarPagoSaldoCompleto', async () => ({}));
  assert.deepEqual(await f.servicio.actualizarPagosContrafactura(11, 400, 100, '2026-11-26', '2026-11-21', 'operador'), {
    success: true, message: 'Pagos sin cambios', updated: false
  });
  assert.equal(f.pagos.eliminarPagosContrafactura.mock.callCount(), 0);
  assert.equal(adelanto.mock.callCount(), 0);
  assert.equal(saldo.mock.callCount(), 0);
});

test('Pagos: actualizar contrafactura elimina una sola vez y registra adelanto y saldo con sus fechas', async () => {
  const f = crearContexto({ pagos: { obtenerPagosContrafacturaPorOrden: mock.fn(async () => ({
    adelantos: [], saldos: [], todos: [{ id: 1 }, { id: 2 }]
  })) } });
  const pasos = [];
  f.pagos.eliminarPagosContrafactura.mock.mockImplementation(async () => { pasos.push('eliminar'); });
  const adelanto = mock.method(f.servicio, 'registrarAdelanto', async () => { pasos.push('adelanto'); return { id: 3 }; });
  const saldo = mock.method(f.servicio, 'registrarPagoSaldoCompleto', async () => { pasos.push('saldo'); return { id: 4 }; });
  assert.deepEqual(await f.servicio.actualizarPagosContrafactura(11, 400, 100, '2026-11-26 08:00:00', '2026-11-21', 'operador'), {
    success: true, message: 'Pagos actualizados exitosamente', updated: true, results: [{ id: 3 }, { id: 4 }]
  });
  assert.deepEqual(pasos, ['eliminar', 'adelanto', 'saldo']);
  assert.equal(f.pagos.eliminarPagosContrafactura.mock.callCount(), 1);
  assert.deepEqual(adelanto.mock.calls[0].arguments, [datosAdelanto({ fechaPago: '2026-11-21' })]);
  assert.deepEqual(saldo.mock.calls[0].arguments, [datosSaldo()]);
});

test('Pagos: actualizar contrafactura permite quitar un adelanto sin volver a crearlo', async () => {
  const f = crearContexto({ pagos: { obtenerPagosContrafacturaPorOrden: mock.fn(async () => ({
    adelantos: [{ monto_pago: 100 }], saldos: [], todos: [{ id: 1 }]
  })) } });
  const adelanto = mock.method(f.servicio, 'registrarAdelanto', async () => ({}));
  const saldo = mock.method(f.servicio, 'registrarPagoSaldoCompleto', async () => ({ success: true }));
  await f.servicio.actualizarPagosContrafactura(11, 400, 0, '2026-11-26', null, 'operador');
  assert.equal(f.pagos.eliminarPagosContrafactura.mock.callCount(), 1);
  assert.equal(adelanto.mock.callCount(), 0);
  assert.deepEqual(saldo.mock.calls[0].arguments, [datosSaldo({ montoAdelanto: 0 })]);
});

for (const caso of [
  { nombre: 'pago inexistente', original: null, cuotas: [{ fecha: '2026-11-26', monto: 100 }], mensaje: 'Pago no encontrado' },
  { nombre: 'pago ya pagado', original: { pagado: 1 }, cuotas: [{ fecha: '2026-11-26', monto: 100 }], mensaje: 'No se puede refinanciar un pago que ya fue marcado como pagado' },
  { nombre: 'lista vacía', cuotas: [], mensaje: 'La cantidad de cuotas debe estar entre 1 y 60' },
  { nombre: 'más de sesenta cuotas', cuotas: Array.from({ length: 61 }, () => ({ fecha: '2026-11-26', monto: 1 })), mensaje: 'La cantidad de cuotas debe estar entre 1 y 60' },
  { nombre: 'cuota sin fecha', cuotas: [{ monto: 100 }], mensaje: 'La cuota 1 debe tener una fecha' },
  { nombre: 'segunda cuota sin fecha', cuotas: [{ fecha: '2026-11-26', monto: 50 }, { monto: 50 }], mensaje: 'La cuota 2 debe tener una fecha' },
  { nombre: 'cuota en cero', cuotas: [{ fecha: '2026-11-26', monto: 0 }], mensaje: 'La cuota 1 debe tener un monto mayor a 0' },
  { nombre: 'cuota negativa', cuotas: [{ fecha: '2026-11-26', monto: -1 }], mensaje: 'La cuota 1 debe tener un monto mayor a 0' },
  { nombre: 'importe superior al original', cuotas: [{ fecha: '2026-11-26', monto: 101 }], mensaje: 'El total refinanciado ($101.00) no puede ser mayor al monto original ($100.00)' }
]) {
  test(`Pagos: refinanciar rechaza ${caso.nombre} sin modificar el pago`, async () => {
    const f = crearContexto(Object.hasOwn(caso, 'original') ? { pagos: { obtenerPorId: mock.fn(async () => caso.original) } } : {});
    assert.deepEqual(await f.servicio.refinanciarPago(9, caso.cuotas, 'operador'), { success: false, message: caso.mensaje });
    assert.equal(f.pagos.refinanciarPagoVariable.mock.callCount(), 0);
  });
}

test('Pagos: refinanciar distribuye las cuotas y conserva el usuario y las observaciones', async () => {
  const f = crearContexto();
  const cuotas = Object.freeze([{ fecha: '2026-11-26', monto: '40' }, { fecha: '2026-12-03', monto: '60' }]);
  const resultado = await f.servicio.refinanciarPago(9, cuotas, 'operador', 'Acuerdo con proveedor');
  assert.deepEqual(f.pagos.obtenerPorId.mock.calls[0].arguments, [9]);
  assert.deepEqual(f.pagos.refinanciarPagoVariable.mock.calls[0].arguments, [
    9, { id: 9, pagado: 0, monto_pago: '100' }, cuotas, 'operador', 'Acuerdo con proveedor'
  ]);
  assert.deepEqual(resultado, { success: true, message: 'Pago refinanciado exitosamente en 2 cuotas', data: {
    pagoOriginalEliminado: 9, cuotasCreadas: [{ id: 201, fecha: '2026-11-26', monto: '40' },
      { id: 202, fecha: '2026-12-03', monto: '60' }], totalRefinanciado: 100
  } });
});

test('Pagos: refinanciar permite un total menor al original y observaciones ausentes', async () => {
  const f = crearContexto();
  assert.equal((await f.servicio.refinanciarPago(9, [{ fecha: '2026-11-26', monto: 90 }], 'operador')).success, true);
  assert.equal(f.pagos.refinanciarPagoVariable.mock.calls[0].arguments[4], null);
});

for (const caso of [
  { nombre: 'ningún pago seleccionado', ids: [], mensaje: 'Debe seleccionar al menos un pago' },
  { nombre: 'identificadores ausentes', ids: null, mensaje: 'Debe seleccionar al menos un pago' },
  { nombre: 'pago inexistente', registros: [pagoMultiple(1)], mensaje: 'Algunos pagos seleccionados no existen' },
  { nombre: 'pago ya pagado', registros: [pagoMultiple(1), pagoMultiple(2, { pagado: 1 })], mensaje: 'Hay pagos seleccionados que ya están marcados como pagados' },
  ...[
    { nombre: 'proveedores distintos', cambio: { proveedor_id: 8 } },
    { nombre: 'monedas distintas', cambio: { moneda: 'USD' } },
    { nombre: 'medios de pago distintos', cambio: { medio_pago: 'Efectivo' } }
  ].map(c => ({ nombre: c.nombre, registros: [pagoMultiple(1), pagoMultiple(2, c.cambio)],
    mensaje: 'Los pagos deben pertenecer al mismo proveedor, moneda y medio de pago para un comprobante único' }))
]) {
  test(`Pagos: un pago múltiple rechaza ${caso.nombre} y libera la conexión sin iniciar transacción`, async () => {
    const f = crearContexto(caso.registros ? { pagos: { obtenerPagosPorIds: mock.fn(async () => caso.registros) } } : {});
    const ids = Object.hasOwn(caso, 'ids') ? caso.ids : [1, 2];
    assert.deepEqual(await f.servicio.registrarPagoMultiple(ids, 'operador'), { success: false, message: caso.mensaje });
    assert.equal(f.conexion.beginTransaction.mock.callCount(), 0);
    assert.equal(f.conexion.commit.mock.callCount(), 0);
    assert.equal(f.conexion.rollback.mock.callCount(), 0);
    assert.equal(f.pagos.registrarPagoMultiple.mock.callCount(), 0);
    assert.deepEqual(f.eventos, ['liberar']);
    if (!ids || ids.length === 0) assert.equal(f.pagos.obtenerPagosPorIds.mock.callCount(), 0);
  });
}

test('Pagos: un pago múltiple suma los importes y confirma después de marcar todos los pagos', async () => {
  const f = crearContexto({ pagos: { obtenerPagosPorIds: mock.fn(async () => [
    pagoMultiple(1, { moneda: 'usd', monto_pago: '40.25' }),
    pagoMultiple(2, { moneda: 'USD', monto_pago: '59.75', orden_compra_id: 12, orden_codigo: 'OC-012', bien_nombre: null })
  ]) } });
  assert.deepEqual(await f.servicio.registrarPagoMultiple([1, 2], 'operador', 'Factura A-123'), {
    success: true, message: 'Pago múltiple registrado exitosamente', pagoId: 104
  });
  assert.deepEqual(f.pagos.obtenerPagosPorIds.mock.calls[0].arguments, [[1, 2]]);
  assert.deepEqual(f.pagos.registrarPagoMultiple.mock.calls[0].arguments, [{
    ordenCompraId: 11, proveedorId: 7, montoPago: 100, fechaPago: '2026-11-21', registradoPor: 'operador',
    observaciones: 'Pago múltiple generado desde el listado. Items: 2', moneda: 'USD', medioPago: 'Transferencia', connection: f.conexion
  }]);
  assert.deepEqual(f.pagos.marcarComoPagado.mock.calls[0].arguments, [104, 'operador', [
    'Pago múltiple con comprobante único.', 'OC OC-011 - Correa (C-10) - USD 40.25',
    'OC OC-012 - Sin bien - USD 59.75', 'Detalle comprobante: Factura A-123'
  ].join('\n'), f.conexion]);
  assert.deepEqual(f.pagos.marcarComoPagadoMultiple.mock.calls[0].arguments, [
    [1, 2], 'operador', 'Incluido en pago múltiple #104.', f.conexion
  ]);
  assert.deepEqual(f.eventos, ['iniciar', 'registrar', 'marcar nuevo', 'marcar originales', 'confirmar', 'liberar']);
  assert.equal(f.conexion.rollback.mock.callCount(), 0);
});

test('Pagos: el detalle de un pago múltiple admite bienes sin código y comprobante sin descripción manual', async () => {
  const f = crearContexto({ pagos: { obtenerPagosPorIds: mock.fn(async () => [pagoMultiple(1, { bien_codigo: null, medio_pago: null })]) } });
  await f.servicio.registrarPagoMultiple([1], 'operador');
  assert.equal(f.pagos.marcarComoPagado.mock.calls[0].arguments[2],
    'Pago múltiple con comprobante único.\nOC OC-011 - Correa - ARS 50.00');
  assert.equal(f.pagos.registrarPagoMultiple.mock.calls[0].arguments[0].medioPago, null);
});

for (const dependencia of ['registrarPagoMultiple', 'marcarComoPagado', 'marcarComoPagadoMultiple']) {
  test(`Pagos: si falla ${dependencia} en un pago múltiple se revierte y libera sin confirmar`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ pagos: { [dependencia]: mock.fn(async () => { throw error; }) } });
    await assert.rejects(f.servicio.registrarPagoMultiple([1, 2], 'operador'), recibido => recibido === error);
    assert.equal(f.conexion.beginTransaction.mock.callCount(), 1);
    assert.equal(f.conexion.commit.mock.callCount(), 0);
    assert.equal(f.conexion.rollback.mock.callCount(), 1);
    assert.equal(f.conexion.release.mock.callCount(), 1);
    assert.deepEqual(f.eventos.slice(-2), ['revertir', 'liberar']);
    if (dependencia !== 'marcarComoPagadoMultiple') assert.equal(f.pagos.marcarComoPagadoMultiple.mock.callCount(), 0);
  });
}

test('Pagos: si falla la consulta de pagos múltiples se propaga el error y se libera la conexión', async () => {
  const error = new Error('Falla simulada de consulta');
  const f = crearContexto({ pagos: { obtenerPagosPorIds: mock.fn(async () => { throw error; }) } });
  await assert.rejects(f.servicio.registrarPagoMultiple([1, 2], 'operador'), recibido => recibido === error);
  assert.equal(f.conexion.beginTransaction.mock.callCount(), 0);
  assert.equal(f.pagos.registrarPagoMultiple.mock.callCount(), 0);
  assert.equal(f.conexion.release.mock.callCount(), 1);
});

test('Pagos: si falla la confirmación de un pago múltiple se intenta revertir y se libera la conexión', async () => {
  const error = new Error('Falla simulada al confirmar');
  const f = crearContexto({ conexion: { commit: mock.fn(async () => { throw error; }) } });
  await assert.rejects(f.servicio.registrarPagoMultiple([1, 2], 'operador'), recibido => recibido === error);
  assert.equal(f.conexion.rollback.mock.callCount(), 1);
  assert.equal(f.conexion.release.mock.callCount(), 1);
});

test('Pagos: si no se obtiene conexión para un pago múltiple se propaga el error sin consultar pagos', async () => {
  const error = new Error('Falla simulada de conexión');
  const f = crearContexto({ pool: { getConnection: mock.fn(async () => { throw error; }) } });
  await assert.rejects(f.servicio.registrarPagoMultiple([1, 2], 'operador'), recibido => recibido === error);
  assert.equal(f.pagos.obtenerPagosPorIds.mock.callCount(), 0);
});

for (const caso of [
  { metodo: 'registrarPagoPorRecepcion', grupo: 'ordenes', dependencia: 'obtenerProveedorDeItem', argumentos: [11, 4, 2, 'operador'] },
  { metodo: 'registrarPagoPorRecepcion', dependencia: 'registrarPagoRecepcion', argumentos: [11, 4, 2, 'operador'] },
  ...operacionesContrafactura.flatMap(c => [
    { metodo: c.metodo, grupo: 'ordenes', dependencia: 'obtenerPorId', argumentos: [c.datos()] },
    { metodo: c.metodo, dependencia: c.registro, argumentos: [c.datos()] }
  ]),
  { metodo: 'eliminarPagosContrafactura', argumentos: [11] },
  { metodo: 'obtenerPagosPorOrden', argumentos: [11] },
  { metodo: 'obtenerResumenPorFecha', argumentos: ['2026-11-01', '2026-11-30'] },
  { metodo: 'obtenerTotalAdelantos', argumentos: [11] },
  { metodo: 'actualizarOCrearAdelanto', dependencia: 'obtenerPagosContrafacturaPorOrden', argumentos: [datosAdelanto()] },
  { metodo: 'actualizarOCrearSaldoCompleto', dependencia: 'obtenerPagosContrafacturaPorOrden', argumentos: [datosSaldo()] },
  { metodo: 'actualizarPagosContrafactura', dependencia: 'obtenerPagosContrafacturaPorOrden', argumentos: [11, 400, 100, '2026-11-26', null, 'operador'] },
  { metodo: 'refinanciarPago', dependencia: 'obtenerPorId', argumentos: [9, [{ fecha: '2026-11-26', monto: 100 }], 'operador'] },
  { metodo: 'refinanciarPago', dependencia: 'refinanciarPagoVariable', argumentos: [9, [{ fecha: '2026-11-26', monto: 100 }], 'operador'] }
]) {
  test(`Pagos: ${caso.metodo} propaga el error original de ${caso.dependencia || caso.metodo}`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [caso.grupo || 'pagos']: { [caso.dependencia || caso.metodo]: mock.fn(async () => { throw error; }) } });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
  });
}
