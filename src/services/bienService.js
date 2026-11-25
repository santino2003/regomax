const bienRepository = require('../repositories/bienRepository');
const categoriaRepository = require('../repositories/categoriaRepository');
const familiaRepository = require('../repositories/familiaRepository');
const unidadMedidaRepository = require('../repositories/unidadMedidaRepository');
const almacenRepository = require('../repositories/almacenRepository');
const proveedorRepository = require('../repositories/proveedorRepository');
const configAlertasStockRepository = require('../repositories/configAlertasStockRepository');
const emailService = require('../utils/emailService');
const bienProveedorService = require('./bienProveedorService');
const db = require('../config/db');
const { afterCommit } = require('../utils/transaction');
const { stockQuantity } = require('../utils/stockQuantity');

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
            
            // Procesar proveedores - array de tuplas [(id, precio, moneda)]
            const proveedoresData = bienData.proveedores || [];
            
            // Procesar familias
            const familiasIds = bienData.familias || [];
            
            // Crear el bien
            const result = await bienRepository.crearBien(bienData, familiasIds);
            
            // Pasar el ID del bien creado y las tuplas de proveedores
            const resultInserProveedor = await bienProveedorService.crearAsociacionesProveedores(
                result.id, 
                proveedoresData
            );
            
            return {
                success: true,
                message: 'Bien creado exitosamente',
                data: result,
                dataProveedor: resultInserProveedor
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
            
            // Procesar proveedores - array de tuplas [(id, precio, moneda)]
            const proveedoresData = bienData.proveedores || [];
            
            // Procesar familias
            const familiasIds = bienData.familias || [];
            
            // Modificar el bien (sin tocar proveedores en el repository)
            await bienRepository.modificarBien(id, bienData, familiasIds);
            
            // Editar asociaciones de proveedores (elimina las viejas y crea las nuevas)
            const resultEditarProveedor = await bienProveedorService.editarAsociacionesProveedores(
                id,
                proveedoresData
            );
            
            return {
                success: true,
                message: 'Bien modificado exitosamente',
                dataProveedor: resultEditarProveedor
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

    async obtenerParaExportar(datos = {}) {
        const invalidar = mensaje => { throw Object.assign(new Error(mensaje), { status: 400 }); };
        if (!datos || !['todos', 'filtrados', 'seleccionados'].includes(datos.alcance)) invalidar('Seleccione qué bienes desea exportar.');
        const filtros = {};
        if (datos.alcance === 'seleccionados') {
            if (!Array.isArray(datos.ids) || !datos.ids.length) invalidar('Seleccione al menos un bien.');
            if (datos.ids.some(id => !['string', 'number'].includes(typeof id) || !/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))) invalidar('La selección contiene bienes inválidos.');
            filtros.ids = [...new Set(datos.ids.map(Number))];
        } else if (datos.alcance === 'filtrados') {
            const entrada = datos.filtros || {};
            for (const campo of ['tipo', 'categoria_id', 'familia_id', 'busqueda']) {
                if (entrada[campo] !== undefined) {
                    if (typeof entrada[campo] !== 'string') invalidar('Los filtros de exportación son inválidos.');
                    filtros[campo] = entrada[campo];
                }
            }
            filtros.critico = entrada.critico === true || entrada.critico === '1' || entrada.critico === 'true';
        }
        const resultado = await bienRepository.obtenerTodos(1, null, filtros);
        if (filtros.ids && resultado.data.length !== filtros.ids.length) invalidar('Algunos bienes seleccionados ya no están disponibles. Actualice el listado.');
        return resultado.data;
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
            if (!['string', 'number'].includes(typeof cantidad) || String(cantidad).trim() === '') {
                throw new Error('La cantidad debe ser un número válido');
            }
            cantidad = Number(cantidad);
            if (!Number.isFinite(cantidad) || cantidad < 0) {
                throw new Error('La cantidad debe ser un número finito no negativo');
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

    async incrementarStock(id, cantidad, connection) {
        return this.cambiarStock(id, cantidad, 1, connection);
    }

    async descontarStock(id, cantidad, connection) {
        return this.cambiarStock(id, cantidad, -1, connection);
    }

    async cambiarStock(id, cantidad, direccion, connection) {
        cantidad = stockQuantity(cantidad);
        if (!connection) {
            return db.withTransaction(tx => this.cambiarStock(id, cantidad, direccion, tx));
        }
        const bien = await bienRepository.obtenerStockPorId(id, connection);
        if (!bien) throw new Error('Bien no encontrado');
        if (bien.es_kit) throw new Error('El stock de un kit debe actualizarse mediante sus componentes');

        const stockAnterior = Number(bien.cantidad_stock);
        const stockNuevo = stockAnterior + direccion * cantidad;
        if (!Number.isFinite(stockNuevo) || stockNuevo < 0) {
            throw new Error(`Stock insuficiente. Stock actual: ${bien.cantidad_stock}, intentando descontar: ${cantidad}`);
        }
        await bienRepository.actualizarStock(id, stockNuevo, connection);

        if (direccion < 0 && bien.cantidad_critica != null && stockNuevo <= Number(bien.cantidad_critica) &&
            stockAnterior > Number(bien.cantidad_critica)) {
            afterCommit(connection, () => this.notificarStockCritico({ ...bien, cantidad_stock: stockNuevo }));
        }
        return {
            success: true,
            message: `Stock actualizado en ${direccion * cantidad} unidad(es)`,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            item: bien
        };
    }

    async notificarStockCritico(bien) {
        const emails = await configAlertasStockRepository.obtenerEmailsActivos();
        if (emails?.length) await emailService.enviarAlertaStockCritico(bien, emails);
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
   
}

module.exports = new BienService();
