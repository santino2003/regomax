const bienRepository = require('../repositories/bienRepository');
const categoriaRepository = require('../repositories/categoriaRepository');
const familiaRepository = require('../repositories/familiaRepository');
const unidadMedidaRepository = require('../repositories/unidadMedidaRepository');
const almacenRepository = require('../repositories/almacenRepository');
const proveedorRepository = require('../repositories/proveedorRepository');

class BienService {
    /**
     * Generar un código único para el bien
     */
    async generarCodigoUnico() {
        let codigoUnico = false;
        let codigo = '';
        
        while (!codigoUnico) {
            // Generar código aleatorio formato: BN-XXXXXX (6 dígitos)
            const numeroAleatorio = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
            codigo = `BN-${numeroAleatorio}`;
            
            // Verificar que no exista usando el repository
            const existe = await bienRepository.existeCodigo(codigo);
            if (!existe) {
                codigoUnico = true;
            }
        }
        
        return codigo;
    }

    /**
     * Crear un nuevo bien
     */
    async crearBien(bienData) {
        try {
            // Validaciones
            if (!bienData.nombre || bienData.nombre.trim() === '') {
                throw new Error('El nombre del bien es obligatorio');
            }
            
            if (!bienData.tipo || !['Uso', 'Consumo'].includes(bienData.tipo)) {
                throw new Error('El tipo de bien debe ser "Uso" o "Consumo"');
            }
            
            // Generar código único si no se proporciona
            if (!bienData.codigo) {
                bienData.codigo = await this.generarCodigoUnico();
            }
            
            // Procesar proveedores
            const proveedoresIds = bienData.proveedores || [];
            
            // Crear el bien
            const result = await bienRepository.crearBien(bienData, proveedoresIds);
            
            return {
                success: true,
                message: 'Bien creado exitosamente',
                data: result
            };
        } catch (error) {
            console.error('Error en BienService.crearBien:', error);
            throw error;
        }
    }

    /**
     * Modificar un bien existente
     */
    async modificarBien(id, bienData) {
        try {
            // Validaciones
            if (!bienData.nombre || bienData.nombre.trim() === '') {
                throw new Error('El nombre del bien es obligatorio');
            }
            
            if (!bienData.tipo || !['Uso', 'Consumo'].includes(bienData.tipo)) {
                throw new Error('El tipo de bien debe ser "Uso" o "Consumo"');
            }
            
            // Procesar proveedores
            const proveedoresIds = bienData.proveedores || [];
            
            await bienRepository.modificarBien(id, bienData, proveedoresIds);
            
            return {
                success: true,
                message: 'Bien modificado exitosamente',
            };
        } catch (error) {
            console.error('Error en BienService.modificarBien:', error);
            throw error;
        }
    }

    /**
     * Eliminar un bien
     */
    async eliminarBien(id) {
        try {
            await bienRepository.eliminarBien(id);
            return {
                success: true,
                message: 'Bien eliminado exitosamente',
            };
        } catch (error) {
            console.error('Error en BienService.eliminarBien:', error);
            throw error;
        }
    }   

    /**
     * Obtener todos los bienes con filtros opcionales
     */
    async obtenerTodos(page = 1, limit = 10, filtros = {}) {
        try {
            const resultado = await bienRepository.obtenerTodos(page, limit, filtros);
            return {
                success: true,
                data: {
                    bienes: resultado.data,
                    paginacion: resultado.pagination
                }
            };
        } catch (error) {
            console.error('Error en BienService.obtenerTodos:', error);
            throw error;
        }
    }

    /**
     * Obtener un bien por ID
     */
    async obtenerPorId(id) {
        try {
            const bien = await bienRepository.obtenerPorId(id);
            if (!bien) {
                throw new Error('Bien no encontrado');
            }
            return bien;
        } catch (error) {
            console.error('Error en BienService.obtenerPorId:', error);
            throw error;
        }
    }

    /**
     * Actualizar cantidad en stock
     */
    async actualizarStock(id, cantidad) {
        try {
            if (cantidad < 0) {
                throw new Error('La cantidad no puede ser negativa');
            }
            
            await bienRepository.actualizarStock(id, cantidad);
            
            return {
                success: true,
                message: 'Stock actualizado exitosamente',
            };
        } catch (error) {
            console.error('Error en BienService.actualizarStock:', error);
            throw error;
        }
    }

    /**
     * Incrementar stock de un bien
     */
    async incrementarStock(id, cantidad) {
        try {
            if (cantidad <= 0) {
                throw new Error('La cantidad debe ser mayor a 0');
            }
            
            const bien = await bienRepository.obtenerPorId(id);
            if (!bien) {
                throw new Error('Bien no encontrado');
            }
            
            const nuevaCantidad = bien.cantidad_stock + cantidad;
            await bienRepository.actualizarStock(id, nuevaCantidad);
            
            return {
                success: true,
                message: `Se incrementó el stock en ${cantidad} unidad(es)`,
            };
        } catch (error) {
            console.error('Error en BienService.incrementarStock:', error);
            throw error;
        }
    }

    /**
     * Descontar stock de un bien
     */
    async descontarStock(id, cantidad) {
        try {
            if (cantidad <= 0) {
                throw new Error('La cantidad debe ser mayor a 0');
            }
            
            const bien = await bienRepository.obtenerPorId(id);
            if (!bien) {
                throw new Error('Bien no encontrado');
            }
            
            const nuevaCantidad = bien.cantidad_stock - cantidad;
            if (nuevaCantidad < 0) {
                throw new Error(`Stock insuficiente. Stock actual: ${bien.cantidad_stock}, intentando descontar: ${cantidad}`);
            }
            
            await bienRepository.actualizarStock(id, nuevaCantidad);
            
            return {
                success: true,
                message: `Se descontó ${cantidad} unidad(es) del stock`,
            };
        } catch (error) {
            console.error('Error en BienService.descontarStock:', error);
            throw error;
        }
    }

    /**
     * Guardar archivo adjunto
     */
    async guardarArchivo(bienId, archivoData) {
        try {
            await bienRepository.guardarArchivo(bienId, archivoData);
            return {
                success: true,
                message: 'Archivo guardado exitosamente',
            };
        } catch (error) {
            console.error('Error en BienService.guardarArchivo:', error);
            throw error;
        }
    }

    /**
     * Eliminar archivo adjunto
     */
    async eliminarArchivo(archivoId) {
        try {
            const archivo = await bienRepository.eliminarArchivo(archivoId);
            if (!archivo) {
                throw new Error('Archivo no encontrado');
            }
            return {
                success: true,
                message: 'Archivo eliminado exitosamente',
                archivo
            };
        } catch (error) {
            console.error('Error en BienService.eliminarArchivo:', error);
            throw error;
        }
    }

    /**
     * Obtener datos para dropdowns (categorías, familias, etc.)
     */
    async obtenerDatosParaFormulario() {
        try {
            // Obtener todas las opciones sin paginación
            const categorias = await categoriaRepository.obtenerTodas(1, 1000);
            const familias = await familiaRepository.obtenerTodas(1, 1000);
            const unidadesMedida = await unidadMedidaRepository.obtenerTodas(1, 1000);
            const almacenes = await almacenRepository.obtenerTodos(1, 1000);
            // proveedorRepository tiene orden diferente de parámetros: (filtros, page, limit)
            const proveedores = await proveedorRepository.obtenerTodos({}, 1, 1000);
            
            return {
                categorias: categorias.data || [],
                familias: familias.data || [],
                unidadesMedida: unidadesMedida.data || [],
                almacenes: almacenes.data || [],
                proveedores: proveedores.data || [],
                tipos: ['Uso', 'Consumo']
            };
        } catch (error) {
            console.error('Error en BienService.obtenerDatosParaFormulario:', error);
            throw error;
        }
    }

    /**
     * Verificar bienes con stock crítico
     */
    async obtenerBienesStockCritico() {
        try {
            // Esta funcionalidad será útil para las notificaciones futuras
            const bienes = await bienRepository.obtenerTodos(1, 1000);
            
            // Filtrar bienes donde cantidad_stock <= cantidad_critica
            const bienesEnStockCritico = bienes.data.filter(bien => 
                bien.cantidad_critica !== null && 
                bien.cantidad_stock <= bien.cantidad_critica
            );
            
            return bienesEnStockCritico;
        } catch (error) {
            console.error('Error en BienService.obtenerBienesStockCritico:', error);
            throw error;
        }
    }
}

module.exports = new BienService();
