const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

// Substitute external dependencies without importing the live database/configuration.
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

function dispatch(router, { method = 'GET', url = '/', originalUrl = url, body = {}, headers = {}, cookies = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, url, originalUrl, body, headers, cookies, query: {}, socket: {} };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { resolve({ status: this.statusCode, data }); return this; },
      render(view, data) { resolve({ status: this.statusCode, view, data }); return this; },
      redirect(location) { resolve({ status: 302, location }); return this; }
    };
    router.handle(req, res, error => error ? reject(error) : resolve({ status: 404 }));
  });
}

module.exports = { loadModule, dispatch };
