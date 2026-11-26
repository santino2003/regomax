const repositorio = require('../repositories/empresaIngresoRepository');

class EmpresaIngresoService {
    error(mensaje, status = 400) { return Object.assign(new Error(mensaje), { status }); }
    validarId(id) {
        if (!['string', 'number'].includes(typeof id) || !/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) throw this.error('Seleccione una empresa válida.');
        return Number(id);
    }
    listar(soloActivas = false) { return repositorio.listar(soloActivas); }
    async obtener(id) {
        const empresa = await repositorio.obtener(this.validarId(id));
        if (!empresa) throw this.error('La empresa no existe.', 404);
        return empresa;
    }
    async guardar(datos, id) {
        if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw this.error('Ingrese los datos de la empresa.');
        const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
        if (!nombre || nombre.length > 255 || /[\x00-\x1f\x7f]/.test(nombre)) throw this.error('Ingrese un nombre de empresa de hasta 255 caracteres.');
        if (datos.descripcion != null && typeof datos.descripcion !== 'string') throw this.error('La descripción debe ser texto.');
        const descripcion = (datos.descripcion || '').trim();
        if (descripcion.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(descripcion)) throw this.error('La descripción admite hasta 2000 caracteres.');
        if (id !== undefined) id = (await this.obtener(id)).id;
        try {
            return await repositorio.guardar({ nombre, descripcion: descripcion || null, activo: datos.activo === false || datos.activo === 0 || datos.activo === '0' ? 0 : 1 }, id);
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') throw this.error('Ya existe una empresa con ese nombre. Puede buscarla en el padrón, incluso entre las dadas de baja.', 409);
            throw error;
        }
    }
    async eliminar(id) { await repositorio.darDeBaja((await this.obtener(id)).id); }
}
module.exports = new EmpresaIngresoService();
