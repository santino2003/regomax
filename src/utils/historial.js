const etiquetas = {
    login: 'Inicio de sesión', logout: 'Cierre de sesión', bien: 'Bien',
    bolson: 'Bolsón', maquina: 'Máquina', categoria: 'Categoría',
    unidadMedida: 'Unidad de medida', codigo: 'Código', bien_id: 'ID del bien',
    descripcion: 'Descripción', cantidad: 'Cantidad', username: 'Usuario',
    items_count: 'Cantidad de ítems', success: 'Resultado', message: 'Mensaje'
};

function etiqueta(valor) {
    if (etiquetas[valor]) return etiquetas[valor];
    const texto = String(valor || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function parsearDetalles(valor) {
    if (typeof valor !== 'string') return valor;
    try { return JSON.parse(valor); } catch { return valor; }
}

// Aplanar objetos y listas conserva todos los datos sin mostrar sintaxis JSON.
function filasDetalles(valor, prefijo = '') {
    valor = parsearDetalles(valor);
    if (valor && typeof valor === 'object') {
        return Object.entries(valor).flatMap(([clave, dato]) => {
            const nombre = Array.isArray(valor) ? `Ítem ${Number(clave) + 1}` : etiqueta(clave);
            return filasDetalles(dato, prefijo ? `${prefijo} / ${nombre}` : nombre);
        });
    }
    const texto = valor == null || valor === '' ? 'Sin datos' :
        typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor);
    return [{ campo: prefijo || 'Detalle', valor: texto }];
}

module.exports = { etiqueta, parsearDetalles, filasDetalles };
