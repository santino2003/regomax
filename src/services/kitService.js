const kitRepository = require('../repositories/kitRepository');
const db = require('../config/db');
const { stockQuantity } = require('../utils/stockQuantity');
const bienRepository = require('../repositories/bienRepository');
const bienService = require('./bienService');
const categoriaRepository = require('../repositories/categoriaRepository');
const familiaRepository = require('../repositories/familiaRepository');
const unidadMedidaRepository = require('../repositories/unidadMedidaRepository');
const almacenRepository = require('../repositories/almacenRepository');

class KitService {
    /**
     * Generar un código único para el kit
     */
    async generarCodigoUnico() {
        let codigoUnico = false;
        let codigo = '';
        
        while (!codigoUnico) {
            // Generar código aleatorio formato: KIT-XXXXXX (6 dígitos)
            const numeroAleatorio = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
            codigo = `KIT-${numeroAleatorio}`;
            
            // Verificar que no exista usando el repository de bienes
            const existe = await bienRepository.existeCodigo(codigo);
            if (!existe) {
                codigoUnico = true;
            }
        }
        
        return codigo;
    }

    /**
     * Crear un nuevo kit
     */
    async crearKit(kitData) {
        try {
            // Validaciones
            if (!kitData.nombre || kitData.nombre.trim() === '') {
                throw new Error('El nombre del kit es obligatorio');
            }
            
            if (!kitData.componentes || kitData.componentes.length < 2) {
                throw new Error('Un kit debe tener al menos 2 componentes');
            }
            
            // Generar código único si no se proporciona
            if (!kitData.codigo) {
                kitData.codigo = await this.generarCodigoUnico();
            }
            
            // Procesar componentes
            const componentesIds = kitData.componentes;
            
            // Calcular precio total del kit (suma de precios de componentes)
            let precioTotal = 0;
            for (const comp of componentesIds) {
                const bien = await bienRepository.obtenerPorId(comp.bien_id);
                if (bien) {
                    precioTotal += (bien.precio || 0) * (comp.cantidad || 1);
                }
            }
            kitData.precio = precioTotal;
            
            // Crear el kit
            const result = await kitRepository.crearKit(kitData, componentesIds);
            
            return {
                success: true,
                message: 'Kit creado exitosamente',
                data: result
            };
        } catch (error) {
            console.error('Error en KitService.crearKit:', error);
            throw error;
        }
    }

    /**
     * Modificar un kit existente
     */
    async modificarKit(id, kitData) {
        try {
            // Validaciones
            if (!kitData.nombre || kitData.nombre.trim() === '') {
                throw new Error('El nombre del kit es obligatorio');
            }
            
            if (!kitData.componentes || kitData.componentes.length < 2) {
                throw new Error('Un kit debe tener al menos 2 componentes');
            }
            
            // Procesar componentes
            const componentesIds = kitData.componentes;
            
            // Calcular precio total del kit
            let precioTotal = 0;
            for (const comp of componentesIds) {
                const bien = await bienRepository.obtenerPorId(comp.bien_id);
                if (bien) {
                    precioTotal += (bien.precio || 0) * (comp.cantidad || 1);
                }
            }
            kitData.precio = precioTotal;
            
            await kitRepository.modificarKit(id, kitData, componentesIds);
            
            return {
                success: true,
                message: 'Kit modificado exitosamente',
            };
        } catch (error) {
            console.error('Error en KitService.modificarKit:', error);
            throw error;
        }
    }

    /**
     * Eliminar un kit
     */
    async eliminarKit(id) {
        try {
            await kitRepository.eliminarKit(id);
            return {
                success: true,
                message: 'Kit eliminado exitosamente',
            };
        } catch (error) {
            console.error('Error en KitService.eliminarKit:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los kits con filtros y paginación
     */
    async obtenerTodos(page = 1, limit = 10, filtros = {}) {
        try {
            return await kitRepository.obtenerTodos(page, limit, filtros);
        } catch (error) {
            console.error('Error en KitService.obtenerTodos:', error);
            throw error;
        }
    }

    /**
     * Obtener un kit por ID
     */
    async obtenerPorId(id, connection) {
        try {
            const kit = await kitRepository.obtenerPorId(id, connection);
            if (!kit) {
                throw new Error('Kit no encontrado');
            }
            return kit;
        } catch (error) {
            console.error('Error en KitService.obtenerPorId:', error);
            throw error;
        }
    }

    async descontarStock(id, cantidad, connection) {
        return this.cambiarStock(id, cantidad, -1, connection);
    }

    async incrementarStock(id, cantidad, connection) {
        return this.cambiarStock(id, cantidad, 1, connection);
    }

    async cambiarStock(id, cantidad, direccion, connection) {
        cantidad = stockQuantity(cantidad);
        if (!connection) {
            return db.withTransaction(tx => this.cambiarStock(id, cantidad, direccion, tx));
        }
        const kit = await kitRepository.obtenerPorId(id, connection);
        if (!kit) throw new Error('Kit no encontrado');
        if (!kit.componentes.length) throw new Error('El kit no tiene componentes');

        const componentes = [...kit.componentes].sort((a, b) => a.bien_componente_id - b.bien_componente_id);
        for (const componente of componentes) {
            const unidades = stockQuantity(componente.cantidad) * cantidad;
            if (direccion < 0) {
                await bienService.descontarStock(componente.bien_componente_id, unidades, connection);
            } else {
                await bienService.incrementarStock(componente.bien_componente_id, unidades, connection);
            }
        }
        const actualizado = await kitRepository.obtenerPorId(id, connection);
        return {
            success: true,
            message: `Stock del kit actualizado en ${direccion * cantidad} unidad(es)`,
            stock_anterior: kit.cantidad_stock,
            stock_nuevo: actualizado.cantidad_stock,
            item: kit
        };
    }

    /**
     * Obtener datos para formulario de creación/edición
     */
    async obtenerDatosFormulario() {
        try {
            // Obtener todas las opciones sin paginación (límite alto)
            const [categorias, familias, unidadesMedida, almacenes, bienesDisponibles] = await Promise.all([
                categoriaRepository.obtenerTodas(1, 1000),
                familiaRepository.obtenerTodas(1, 1000),
                unidadMedidaRepository.obtenerTodas(1, 1000),
                almacenRepository.obtenerTodos(1, 1000),
                kitRepository.obtenerBienesDisponibles()
            ]);
            
            return {
                categorias: categorias.data || [],
                familias: familias.data || [],
                unidadesMedida: unidadesMedida.data || [],
                almacenes: almacenes.data || [],
                bienesDisponibles: bienesDisponibles || [],
                tipos: ['Uso', 'Consumo']
            };
        } catch (error) {
            console.error('Error en KitService.obtenerDatosFormulario:', error);
            throw error;
        }
    }
}

module.exports = new KitService();
