const fs = require('node:fs');
const path = require('node:path');
const { mock } = require('node:test');
const { loadModule } = require('./loadModule');

function cargarServicio(nombre, dependencias = {}) {
  const archivo = `src/services/${nombre}.js`;
  const codigo = fs.readFileSync(path.resolve(__dirname, '..', archivo), 'utf8');
  // Toda dependencia local queda simulada, excepto la validación numérica pura.
  // Así una prueba de servicio no puede cargar accidentalmente la base de datos.
  const simulaciones = Object.fromEntries([...codigo.matchAll(/require\(['"]([^'"]+)['"]\)/g)]
    .map(coincidencia => coincidencia[1])
    .filter(ruta => ruta.startsWith('.') && ruta !== '../utils/stockQuantity')
    .map(ruta => [ruta, {}]));
  return loadModule(archivo, { ...simulaciones, ...dependencias });
}

function simularTransaccion() {
  const conexion = { identificador: 'conexion-simulada' };
  const db = { withTransaction: mock.fn(async tarea => tarea(conexion)), query: mock.fn() };
  return { conexion, db };
}

module.exports = { cargarServicio, simularTransaccion };
