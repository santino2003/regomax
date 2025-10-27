/**
 * bolsonesDespachados.js - Maneja la funcionalidad específica de la página de bolsones despachados
 */

document.addEventListener('DOMContentLoaded', function() {
    // Obtener los parámetros de la URL para mantener el estado de los filtros
    const urlParams = new URLSearchParams(window.location.search);
    
    // Obtener los valores de los filtros desde la URL
    const producto = urlParams.get('producto') || '';
    const codigo = urlParams.get('codigo') || '';
    const precinto = urlParams.get('precinto') || '';
    
    // Establecer los valores en los campos del formulario
    document.getElementById('producto').value = producto;
    document.getElementById('codigo').value = codigo;
    document.getElementById('precinto').value = precinto;

    // Manejar la exportación de bolsones despachados
    const exportarBtn = document.getElementById('exportar-despachados');
    if (exportarBtn) {
        exportarBtn.addEventListener('click', function() {
            // Cambiar el estado del botón para mostrar que está procesando
            exportarBtn.disabled = true;
            exportarBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Exportando...';
            
            // Redirigir directamente a la ruta de exportación sin el prefijo /api/
            // El middleware de permisos se encargará de verificar y mostrar errores si es necesario
            window.location.href = '/despachos/exportar-despachados';
            
            // Restaurar el botón después de un tiempo
            setTimeout(function() {
                exportarBtn.disabled = false;
                exportarBtn.innerHTML = '<i class="bi bi-file-earmark-excel me-2"></i>Exportar';
            }, 3000);
        });
    }
    
    // Asegurarse de que los enlaces de paginación mantengan los filtros
    document.querySelectorAll('.pagination .page-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
            const url = new URL(href, window.location.origin);
            
            // Asegurarse de que todos los filtros activos se mantengan
            if (producto) url.searchParams.set('producto', producto);
            if (codigo) url.searchParams.set('codigo', codigo);
            if (precinto) url.searchParams.set('precinto', precinto);
            
            // Actualizar el href con los filtros
            link.setAttribute('href', url.pathname + url.search);
        }
    });
    
    // Corregir el estilo de fondo de precintos en la tabla
    document.querySelectorAll('.table tbody tr td:nth-child(5)').forEach(cell => {
        if (cell.textContent.trim() !== '-') {
            // Eliminar cualquier clase de fondo que pueda existir
            cell.classList.remove('bg-info', 'bg-primary', 'bg-success', 'bg-warning', 'bg-danger');
            
            // Aplicar solo el texto en negrita sin fondo de color
            cell.classList.add('fw-bold');
        }
    });
    
    // Capturar el formulario de filtros
    const filtrosForm = document.getElementById('filtrosForm');
    
    // Asegurarse de que los parámetros de filtro estén en todas las URLs de paginación
    const actualizarEnlacesPaginacion = () => {
        // Obtener los valores actuales de filtros
        const producto = document.getElementById('producto').value;
        const codigo = document.getElementById('codigo').value;
        const precinto = document.getElementById('precinto').value;
        
        // Seleccionar todos los enlaces de paginación
        const enlacesPaginacion = document.querySelectorAll('.pagination .page-link');
        
        // Actualizar cada enlace para incluir los filtros actuales
        enlacesPaginacion.forEach(enlace => {
            let url = new URL(enlace.href);
            
            // Limpiar parámetros existentes de filtros para evitar duplicados
            url.searchParams.delete('producto');
            url.searchParams.delete('codigo');
            url.searchParams.delete('precinto');
            
            // Añadir solo los filtros que tengan valor
            if (producto) url.searchParams.append('producto', producto);
            if (codigo) url.searchParams.append('codigo', codigo);
            if (precinto) url.searchParams.append('precinto', precinto);
            
            // Actualizar el href del enlace
            enlace.href = url.toString();
        });
    };
    
    // Cuando cambie cualquier campo de filtro, actualizar enlaces de paginación
    document.getElementById('producto').addEventListener('change', actualizarEnlacesPaginacion);
    document.getElementById('codigo').addEventListener('change', actualizarEnlacesPaginacion);
    document.getElementById('precinto').addEventListener('change', actualizarEnlacesPaginacion);
    
    // Cuando se envíe el formulario, actualizar enlaces antes de enviarlo
    if (filtrosForm) {
        filtrosForm.addEventListener('submit', function() {
            actualizarEnlacesPaginacion();
        });
    }
    
    // Actualizar enlaces de paginación al cargar la página
    actualizarEnlacesPaginacion();
    
    // Eliminar el fondo celeste del campo de precinto
    const precintoInput = document.getElementById('precinto');
    if (precintoInput) {
        precintoInput.style.backgroundColor = '';
    }
    
    // Manejar el evento de limpieza de filtros
    document.querySelector('a.btn-outline-secondary').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/bolsones-despachados';
    });
});