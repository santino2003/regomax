const historialService = require('../services/historialService');

/**
 * Middleware para registrar acciones en el historial
 * @param {string} accion - Tipo de acción (crear, editar, eliminar, etc.)
 * @param {string} entidad - Entidad afectada (bolson, orden, parte_diario, etc.)
 * @param {function} detallesExtractor - Función para extraer detalles adicionales (opcional)
 */
function registrarHistorial(accion, entidad, detallesExtractor = null) {
    return async (req, res, next) => {
        // Guardamos la respuesta original para interceptarla después
        const originalSend = res.send;
        const originalJson = res.json;
        const originalRender = res.render;

        try {
            // Interceptamos res.send
            res.send = function (body) {
                registrarAccionSiExitosa(res, req, body);
                return originalSend.call(this, body);
            };

            // Interceptamos res.json
            res.json = function (body) {
                registrarAccionSiExitosa(res, req, body);
                return originalJson.call(this, body);
            };

            // Interceptamos res.render
            res.render = function (view, locals, callback) {
                registrarAccionSiExitosa(res, req);
                return originalRender.call(this, view, locals, callback);
            };

            // Continuar con el flujo normal
            next();
        } catch (error) {
            console.error('Error en middleware de historial:', error);
            // No bloqueamos la ejecución aunque haya error en el historial
            next();
        }

        /**
         * Función auxiliar para registrar acción solo si la respuesta fue exitosa
         */
        async function registrarAccionSiExitosa(res, req, body) {
            // Solo registramos si el código de estado indica éxito (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const usuario = req.user ? req.user.username : 'sistema';

                    // Extraer detalles adicionales si se proporcionó un extractor
                    let detalles = null;
                    if (detallesExtractor) {
                        try {
                            detalles = detallesExtractor(req, res, body);
                        } catch (error) {
                            console.warn('Error al extraer detalles:', error);
                        }
                    }

                    // Registrar en historial (eliminamos los parámetros de ID de entidad e IP)
                    await historialService.registrarAccion(usuario, accion, entidad, detalles);
                } catch (error) {
                    console.error('Error al registrar acción en historial:', error);
                }
            }
        }
    };
}

/**
 * Middleware para registrar específicamente acciones de login
 */
function registrarLogin() {
    return registrarHistorial('login', 'usuario', (req) => {
        return { username: req.body.username };
    });
}

/**
 * Middleware para registrar específicamente acciones de logout
 */
function registrarLogout() {
    return registrarHistorial('logout', 'usuario', (req) => {
        return { username: req.user ? req.user.username : 'desconocido' };
    });
}

/**
 * Funciones específicas para extraer detalles de bolsones
 */
const bolsonDetalles = {
    /**
     * Extractor de detalles para creación de bolsón
     */
    crear: (req, res, body) => {
        // Capturar solo los datos relevantes de entrada
        const detalles = {
            producto: req.body.producto,
            peso: req.body.peso,
            precinto: req.body.precinto
        };
        
        // Intentar extraer solo datos relevantes de respuesta
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    // Guardar solo el código, no el barcode base64 que ocupa mucho espacio
                    detalles.codigo = data.data.codigo;
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para consulta de bolsón
     */
    consultar: (req, res, body) => {
        const detalles = { id: req.params.id };
        
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    const bolson = data.data;
                    // Solo guardar los datos relevantes
                    detalles.bolson = {
                        id: bolson.id,
                        codigo: bolson.codigo,
                        producto: bolson.producto,
                        peso: bolson.peso,
                        precinto: bolson.precinto
                    };
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para edición de bolsón
     */
    editar: (req, res, body) => {
        // Solo extraer los campos relevantes que se están actualizando
        const detalles = {
            id: req.params.id,
            campos_actualizados: {}
        };
        
        // Seleccionar solo los campos relevantes a guardar
        if (req.body.producto) detalles.campos_actualizados.producto = req.body.producto;
        if (req.body.peso) detalles.campos_actualizados.peso = req.body.peso;
        if (req.body.precinto) detalles.campos_actualizados.precinto = req.body.precinto;
        
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    // Solo guardar información esencial de la respuesta
                    detalles.resultado = {
                        id: data.data.id,
                        codigo: data.data.codigo
                    };
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para eliminación de bolsón
     */
    eliminar: (req, res, body) => {
        return {
            id: req.params.id
        };
    }
};

/**
 * Funciones específicas para extraer detalles de órdenes de venta
 */
const ordenDetalles = {
    /**
     * Extractor de detalles para creación de orden de venta
     */
    crear: (req, res, body) => {
        const detalles = {
            datos_entrada: {
                cliente: req.body.cliente,
                fecha: req.body.fecha,
                productos: req.body.productos
            }
        };
        
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    detalles.resultado = {
                        id: data.data.id,
                        numero: data.data.numero
                    };
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para consulta de orden de venta
     */
    consultar: (req, res, body) => {
        const detalles = { id: req.params.id };
        
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    const orden = data.data;
                    detalles.orden = {
                        id: orden.id,
                        numero: orden.numero,
                        cliente: orden.cliente,
                        fecha: orden.fecha,
                        estado: orden.estado
                    };
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para edición de orden de venta
     */
    editar: (req, res, body) => {
        const detalles = {
            id: req.params.id,
            campos_actualizados: { ...req.body }
        };
        
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    detalles.resultado = {
                        id: data.data.id,
                        estado: data.data.estado
                    };
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para eliminación de orden de venta
     */
    eliminar: (req, res, body) => {
        return {
            id: req.params.id,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Funciones específicas para extraer detalles de partes diarios
 */
const parteDiarioDetalles = {
    /**
     * Extractor de detalles para creación de parte diario
     */
    crear: (req, res, body) => {
        const detalles = {
            datos_entrada: {
                fecha: req.body.fecha,
                turno: req.body.turno,
                productos: req.body.productos
            }
        };
        
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    detalles.resultado = {
                        id: data.data.id,
                        fecha: data.data.fecha
                    };
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para consulta de parte diario
     */
    consultar: (req, res, body) => {
        const detalles = { id: req.params.id };
        
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    detalles.parte_diario = {
                        id: data.data.id,
                        fecha: data.data.fecha,
                        turno: data.data.turno
                    };
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para edición de parte diario
     */
    editar: (req, res, body) => {
        const detalles = {
            id: req.params.id,
            campos_actualizados: { ...req.body }
        };
        
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    detalles.resultado = data.data;
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para eliminación de parte diario
     */
    eliminar: (req, res, body) => {
        return {
            id: req.params.id,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Funciones específicas para extraer detalles de despachos
 */
const despachoDetalles = {
    /**
     * Extractor de detalles para creación de despacho
     */
    crear: (req, res, body) => {
        const detalles = {
            datos_entrada: {
                orden_id: req.body.orden_id,
                bolsones: req.body.bolsones
            }
        };
        
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    detalles.resultado = {
                        id: data.data.id,
                        bolsones_despachados: data.data.bolsones_despachados
                    };
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    }
};

/**
 * Funciones para registrar acciones de bolsones
 */
const bolson = {
    crear: () => registrarHistorial('crear', 'bolson', bolsonDetalles.crear),
    consultar: () => registrarHistorial('consultar', 'bolson', bolsonDetalles.consultar),
    editar: () => registrarHistorial('editar', 'bolson', bolsonDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'bolson', bolsonDetalles.eliminar)
};

/**
 * Funciones para registrar acciones de órdenes de venta
 */
const orden = {
    crear: () => registrarHistorial('crear', 'orden_venta', ordenDetalles.crear),
    consultar: () => registrarHistorial('consultar', 'orden_venta', ordenDetalles.consultar),
    editar: () => registrarHistorial('editar', 'orden_venta', ordenDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'orden_venta', ordenDetalles.eliminar)
};

/**
 * Funciones para registrar acciones de partes diarios
 */
const parteDiario = {
    crear: () => registrarHistorial('crear', 'parte_diario', parteDiarioDetalles.crear),
    consultar: () => registrarHistorial('consultar', 'parte_diario', parteDiarioDetalles.consultar),
    editar: () => registrarHistorial('editar', 'parte_diario', parteDiarioDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'parte_diario', parteDiarioDetalles.eliminar)
};

/**
 * Funciones para registrar acciones de despachos
 */
const despacho = {
    crear: () => registrarHistorial('crear', 'despacho', despachoDetalles.crear),
    consultar: () => registrarHistorial('consultar', 'despacho', (req) => ({
        orden_id: req.params.ordenId || req.query.ordenId
    }))
};

module.exports = { 
    registrarHistorial,
    registrarLogin,
    registrarLogout,
    bolson,
    orden,
    parteDiario,
    despacho
};