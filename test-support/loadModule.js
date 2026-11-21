const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

// Sustituye dependencias externas sin cargar la base ni la configuración reales.
function loadModule(file, dependencies = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const isolated = new Module(filename, module);
  isolated.filename = filename;
  isolated.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = isolated.require.bind(isolated);
  isolated.require = name => Object.hasOwn(dependencies, name)
    ? dependencies[name]
    : originalRequire(name);
  isolated._compile(fs.readFileSync(filename, 'utf8'), filename);
  return isolated.exports;
}

function dispatch(router, { method = 'GET', url = '/', originalUrl = url, baseUrl = '', body = {}, headers = {}, cookies = {}, query = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, url, originalUrl, baseUrl, body, headers, cookies, query, socket: {} };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
      send(data) { resolve({ status: this.statusCode, data, headers: this.headers }); return this; },
      json(data) { resolve({ status: this.statusCode, data }); return this; },
      render(view, data) { resolve({ status: this.statusCode, view, data }); return this; },
      redirect(location) { resolve({ status: 302, location }); return this; }
    };
    router.handle(req, res, error => error ? reject(error) : resolve({ status: 404 }));
  });
}

module.exports = { loadModule, dispatch };
