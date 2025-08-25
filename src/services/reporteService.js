const reporteRepository = require('../repositories/reporteRepository');

class ReporteService {
    // Obtener los días hábiles configurados para un mes específico
    async obtenerDiasHabilesMes(mes, anio) {
        try {
            return await reporteRepository.obtenerDiasHabilesMes(mes, anio);
        } catch (error) {
            console.error('Error en servicio al obtener días hábiles:', error);
            throw error;
        }
    }
    
    // Guardar los días hábiles configurados para un mes
    async guardarDiasHabiles(mes, anio, diasHabiles) {
        try {
            return await reporteRepository.guardarDiasHabiles(mes, anio, diasHabiles);
        } catch (error) {
            console.error('Error en servicio al guardar días hábiles:', error);
            throw error;
        }
    }
    
    // Obtener datos de NFU para una fecha específica
    async obtenerDatosNFUPorFecha(fecha) {
        try {
            return await reporteRepository.obtenerDatosNFUPorFecha(fecha);
        } catch (error) {
            console.error('Error en servicio al obtener datos NFU por fecha:', error);
            throw error;
        }
    }
    
    // Guardar datos de NFU para una fecha específica
    async guardarDatosNFU(fecha, cantidad, usuarioId) {
        try {
            return await reporteRepository.guardarDatosNFU(fecha, cantidad, usuarioId);
        } catch (error) {
            console.error('Error en servicio al guardar datos NFU:', error);
            throw error;
        }
    }
    
    // Obtener todos los datos de NFU en un rango de fechas (para un mes)
    async obtenerDatosNFURango(fechaInicio, fechaFin) {
        try {
            return await reporteRepository.obtenerDatosNFURango(fechaInicio, fechaFin);
        } catch (error) {
            console.error('Error en servicio al obtener datos NFU por rango:', error);
            throw error;
        }
    }
    
    // Generar reporte completo para una fecha específica
    async generarReporte(fecha, mes, anio) {
        try {
            // Obtener el primer y último día del mes
            const fechaInicio = new Date(anio, mes - 1, 1);
            const fechaFin = new Date(anio, mes, 0);
            
            // Formato de fechas para consultas
            const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
            const fechaFinStr = fechaFin.toISOString().split('T')[0];
            const fechaActualObj = new Date(fecha);
            
            // Obtener días hábiles del mes
            const diasHabiles = await this.obtenerDiasHabilesMes(mes, anio);
            
            // Si no hay días hábiles configurados, no podemos calcular proyecciones
            if (!diasHabiles || !diasHabiles.dias || diasHabiles.dias.length === 0) {
                return {
                    error: "No hay días hábiles configurados para este mes",
                    datosNFU: [],
                    totalAcumulado: 0,
                    proyeccion: 0,
                    diasHabilesTotal: 0,
                    diasHabilesTranscurridos: 0
                };
            }
            
            // Obtener todos los datos de NFU del mes
            const datosNFU = await this.obtenerDatosNFURango(fechaInicioStr, fechaFinStr);
            
            // Calcular el total acumulado hasta la fecha especificada
            let totalAcumulado = 0;
            datosNFU.forEach(dato => {
                const datoFecha = new Date(dato.fecha);
                if (datoFecha <= fechaActualObj) {
                    totalAcumulado += parseFloat(dato.cantidad);
                }
            });
            
            // Contar días hábiles totales del mes
            const diasHabilesTotal = diasHabiles.dias.length;
            
            // Contar días hábiles transcurridos hasta la fecha especificada
            const diasHabilesTranscurridos = diasHabiles.dias.filter(
                diaHabil => new Date(diaHabil) <= fechaActualObj
            ).length;
            
            // Calcular la proyección
            // (cantidad días hábiles hasta la fecha / acumulado) * días hábiles del mes
            let proyeccion = 0;
            if (diasHabilesTranscurridos > 0) {
                proyeccion = (totalAcumulado / diasHabilesTranscurridos) * diasHabilesTotal;
            }
            
            return {
                datosNFU,
                totalAcumulado,
                proyeccion,
                diasHabilesTotal,
                diasHabilesTranscurridos,
                fecha
            };
        } catch (error) {
            console.error('Error en servicio al generar reporte:', error);
            throw error;
        }
    }
}

module.exports = new ReporteService();