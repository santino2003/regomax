// Para texto y atributos HTML entre comillas; los datos originales se conservan en memoria.
function escaparHtml(valor) {
    const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(valor ?? '').replace(/[&<>"']/g, caracter => entidades[caracter]);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escaparHtml };
}
