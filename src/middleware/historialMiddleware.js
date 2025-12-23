const historialService = require('../services/historialService');
const { formatMySQLLocal, fechaActual } = require('../utils/fecha');

/**
 * Middleware para registrar acciones en el historial
 * @param {string} accion - Tipo de acción (crear, editar, eliminar, etc.)
 * @param {string} entidad - Entidad afectada (bolson, orden, parte_diario, etc.)
 * @param {function} detallesExtractor - Función para extraer detalles adicionales (opcional)
 */
function registrarHistorial(accion, entidad, detallesExtractor = null) {
    return async (req, res, next) => {
        // Flag para controlar si ya se registró la acción
        let accionRegistrada = false;
        
        // Guardamos la respuesta original para interceptarla después
        const originalSend = res.send;
        const originalJson = res.json;
        const originalRender = res.render;

        try {
            // Interceptamos res.send
            res.send = function (body) {
                if (!accionRegistrada) {
                    registrarAccionSiExitosa(res, req, body);
                    accionRegistrada = true;
                }
                return originalSend.call(this, body);
            };

            // Interceptamos res.json
            res.json = function (body) {
                if (!accionRegistrada) {
                    registrarAccionSiExitosa(res, req, body);
                    accionRegistrada = true;
                }
                return originalJson.call(this, body);
            };

            // Interceptamos res.render
            res.render = function (view, locals, callback) {
                if (!accionRegistrada) {
                    registrarAccionSiExitosa(res, req);
                    accionRegistrada = true;
                }
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
            timestamp: formatMySQLLocal(fechaActual())
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
        // Capturar datos relevantes de la entrada
        const detalles = {
            datos_entrada: {}
        };
        
        // Capturar ID de orden si existe
        if (req.body.orden_id) {
            detalles.datos_entrada.orden_id = req.body.orden_id;
        } else if (req.params.ordenId) {
            detalles.datos_entrada.orden_id = req.params.ordenId;
        }
        
        // Capturar bolsones a despachar
        if (req.body.bolsones && Array.isArray(req.body.bolsones)) {
            detalles.datos_entrada.bolsones = req.body.bolsones;
        } else if (req.body.bolsones && typeof req.body.bolsones === 'string') {
            try {
                detalles.datos_entrada.bolsones = JSON.parse(req.body.bolsones);
            } catch (e) {
                detalles.datos_entrada.bolsones = req.body.bolsones;
            }
        } else if (req.body.codigos && Array.isArray(req.body.codigos)) {
            detalles.datos_entrada.codigos = req.body.codigos;
        }
        
        // Si hay datos de bolsón individual
        if (req.body.codigo) {
            detalles.datos_entrada.codigo = req.body.codigo;
        }
        
        // Extraer datos de respuesta
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    detalles.resultado = {};
                    
                    // Guardar ID del despacho si existe
                    if (data.data.id) {
                        detalles.resultado.id = data.data.id;
                    }
                    
                    // Guardar información sobre los bolsones despachados
                    if (data.data.bolsones_despachados) {
                        if (Array.isArray(data.data.bolsones_despachados)) {
                            detalles.resultado.bolsones_despachados = data.data.bolsones_despachados.map(bolson => ({
                                id: bolson.id,
                                codigo: bolson.codigo
                            }));
                        } else {
                            detalles.resultado.bolsones_despachados = data.data.bolsones_despachados;
                        }
                    }
                    
                    // Si hay mensajes específicos
                    if (data.message) {
                        detalles.resultado.mensaje = data.message;
                    }
                } else if (data.success && data.bolsones) {
                    // Formato alternativo de respuesta
                    detalles.resultado = {
                        bolsones_despachados: data.bolsones
                    };
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
                console.warn('Error al parsear respuesta de despacho:', e);
            }
        }
        
        return detalles;
    },
    
    /**
     * Extractor de detalles para consulta de despacho
     */
    consultar: (req, res, body) => {
        const detalles = {};
        
        // Capturar ID de orden si existe
        if (req.params.ordenId) {
            detalles.orden_id = req.params.ordenId;
        } else if (req.query.ordenId) {
            detalles.orden_id = req.query.ordenId;
        }
        
        // Extraer datos de respuesta
        if (body) {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.data) {
                    detalles.despachos = Array.isArray(data.data) ? 
                        data.data.map(d => ({ id: d.id, fecha: d.fecha, bolsones: d.bolsones?.length || 0 })) : 
                        data.data;
                }
            } catch (e) {
                // Si no se puede parsear, continuamos sin datos de respuesta
            }
        }
        
        return detalles;
    }
};

/**
 * Funciones específicas para extraer detalles de proveedores
 */
const proveedorDetalles = {
    crear: (req, res, body) => {
        return {
            nombre: req.body?.nombre,
            contacto: req.body?.contacto,
            telefono: req.body?.telefono,
            email: req.body?.email,
            direccion: req.body?.direccion,
            web: req.body?.web,
            rubro: req.body?.rubro,
            responsable: req.user?.username
        };
    },
    editar: (req, res, body) => {
        return {
            proveedor_id: req.params?.id,
            campos_actualizados: {
                nombre: req.body?.nombre,
                contacto: req.body?.contacto,
                telefono: req.body?.telefono,
                email: req.body?.email,
                direccion: req.body?.direccion,
                web: req.body?.web,
                rubro: req.body?.rubro
            },
            responsable: req.user?.username
        };
    },
    eliminar: (req, res, body) => {
        return {
            proveedor_id: req.params?.id,
            responsable: req.user?.username
        };
    }
};

/**
 * Funciones para registrar acciones de proveedores
 */
const proveedor = {
    crear: () => registrarHistorial('crear', 'proveedor', proveedorDetalles.crear),
    editar: () => registrarHistorial('editar', 'proveedor', proveedorDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'proveedor', proveedorDetalles.eliminar)
};

/**
 * Funciones específicas para extraer detalles de clientes NFU
 */
const clienteNFUDetalles = {
    crear: (req, res, body) => {
        return {
            empresa: req.body?.empresa,
            cuit: req.body?.cuit,
            correo: req.body?.correo,
            telefono: req.body?.telefono,
            responsable: req.user?.username
        };
    },
    editar: (req, res, body) => {
        const clienteId = req.params?.id;
        return {
            cliente_id: clienteId,
            empresa: req.body?.empresa,
            cuit: req.body?.cuit,
            correo: req.body?.correo,
            telefono: req.body?.telefono,
            responsable: req.user?.username
        };
    },
    eliminar: (req, res, body) => {
        return {
            cliente_id: req.params?.id,
            responsable: req.user?.username
        };
    }
};

/**
 * Funciones para registrar acciones de clientes NFU
 */
const clienteNFU = {
    crear: () => registrarHistorial('crear', 'cliente_nfu', clienteNFUDetalles.crear),
    editar: () => registrarHistorial('editar', 'cliente_nfu', clienteNFUDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'cliente_nfu', clienteNFUDetalles.eliminar)
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
    consultar: () => registrarHistorial('consultar', 'despacho', despachoDetalles.consultar),
    despacharBolson: () => registrarHistorial('despachar', 'bolson', despachoDetalles.crear)
};

/**
 * Funciones específicas para extraer detalles de familias
 */
const familiaDetalles = {
    crear: (req, res, body) => {
        return {
            nombre: req.body?.nombre,
            responsable: req.user?.username
        };
    },
    editar: (req, res, body) => {
        return {
            familia_id: req.params?.id,
            nombre: req.body?.nombre,
            responsable: req.user?.username
        };
    },
    eliminar: (req, res, body) => {
        return {
            familia_id: req.params?.id,
            responsable: req.user?.username
        };
    }
};

/**
 * Funciones para registrar acciones de familias
 */
const familia = {
    crear: () => registrarHistorial('crear', 'familia', familiaDetalles.crear),
    editar: () => registrarHistorial('editar', 'familia', familiaDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'familia', familiaDetalles.eliminar)
};

/**
 * Funciones específicas para extraer detalles de categorias
 */
const categoriaDetalles = {
    crear: (req, res, body) => {
        return {
            nombre: req.body?.nombre,
            responsable: req.user?.username
        };
    },
    editar: (req, res, body) => {
        return {
            categoria_id: req.params?.id,
            nombre: req.body?.nombre,
            responsable: req.user?.username
        };
    },
    eliminar: (req, res, body) => {
        return {
            categoria_id: req.params?.id,
            responsable: req.user?.username
        };
    }
};

/**
 * Funciones para registrar acciones de categorias
 */
const categoria = {
    crear: () => registrarHistorial('crear', 'categoria', categoriaDetalles.crear),
    editar: () => registrarHistorial('editar', 'categoria', categoriaDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'categoria', categoriaDetalles.eliminar)
};

/**
 * Funciones específicas para extraer detalles de unidades de medida
 */
const unidadMedidaDetalles = {
    crear: (req, res, body) => {
        return {
            nombre: req.body?.nombre,
            nombre_lindo: req.body?.nombreLindo,
            responsable: req.user?.username
        };
    },
    editar: (req, res, body) => {
        return {
            unidad_medida_id: req.params?.id,
            nombre: req.body?.nombre,
            nombre_lindo: req.body?.nombreLindo,
            responsable: req.user?.username
        };
    },
    eliminar: (req, res, body) => {
        return {
            unidad_medida_id: req.params?.id,
            responsable: req.user?.username
        };
    }
};

/**
 * Funciones para registrar acciones de unidades de medida
 */
const unidadMedida = {
    crear: () => registrarHistorial('crear', 'unidadMedida', unidadMedidaDetalles.crear),
    editar: () => registrarHistorial('editar', 'unidadMedida', unidadMedidaDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'unidadMedida', unidadMedidaDetalles.eliminar)
};

/**
 * Funciones específicas para extraer detalles de almacenes
 */
const almacenDetalles = {
    crear: (req, res, body) => {
        return {
            nombre: req.body?.nombre,
            responsable: req.user?.username
        };
    },
    editar: (req, res, body) => {
        return {
            almacen_id: req.params?.id,
            nombre: req.body?.nombre,
            responsable: req.user?.username
        };
    },
    eliminar: (req, res, body) => {
        return {
            almacen_id: req.params?.id,
            responsable: req.user?.username
        };
    }
};

/**
 * Funciones para registrar acciones de almacenes
 */
const almacen = {
    crear: () => registrarHistorial('crear', 'almacen', almacenDetalles.crear),
    editar: () => registrarHistorial('editar', 'almacen', almacenDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'almacen', almacenDetalles.eliminar)
};

/**
 * Funciones específicas para extraer detalles de bienes
 */
const bienDetalles = {
    crear: (req, res, body) => {
        return {
            nombre: req.body?.nombre,
            tipo: req.body?.tipo,
            categoria_id: req.body?.categoria_id,
            familia_id: req.body?.familia_id,
            precio: req.body?.precio,
            proveedores: Array.isArray(req.body?.proveedores) ? req.body.proveedores.join(',') : req.body?.proveedores,
            responsable: req.user?.username
        };
    },
    editar: (req, res, body) => {
        return {
            bien_id: req.params?.id,
            nombre: req.body?.nombre,
            tipo: req.body?.tipo,
            categoria_id: req.body?.categoria_id,
            familia_id: req.body?.familia_id,
            precio: req.body?.precio,
            proveedores: Array.isArray(req.body?.proveedores) ? req.body.proveedores.join(',') : req.body?.proveedores,
            responsable: req.user?.username
        };
    },
    eliminar: (req, res, body) => {
        return {
            bien_id: req.params?.id,
            responsable: req.user?.username
        };
    },
    actualizarStock: (req, res, body) => {
        return {
            bien_id: req.params?.id,
            cantidad: req.body?.cantidad,
            responsable: req.user?.username
        };
    },
    subirArchivo: (req, res, body) => {
        return {
            bien_id: req.params?.id,
            archivo: req.file?.originalname,
            responsable: req.user?.username
        };
    },
    eliminarArchivo: (req, res, body) => {
        return {
            archivo_id: req.params?.archivoId,
            responsable: req.user?.username
        };
    }
};

/**
 * Funciones para registrar acciones de bienes
 */
const bien = {
    crear: () => registrarHistorial('crear', 'bien', bienDetalles.crear),
    editar: () => registrarHistorial('editar', 'bien', bienDetalles.editar),
    eliminar: () => registrarHistorial('eliminar', 'bien', bienDetalles.eliminar),
    actualizarStock: () => registrarHistorial('actualizar_stock', 'bien', bienDetalles.actualizarStock),
    subirArchivo: () => registrarHistorial('subir_archivo', 'bien', bienDetalles.subirArchivo),
    eliminarArchivo: () => registrarHistorial('eliminar_archivo', 'bien', bienDetalles.eliminarArchivo)
};

module.exports = { 
    registrarHistorial,
    registrarLogin,
    registrarLogout,
    bolson,
    orden,
    parteDiario,
    despacho,
    proveedor,
    clienteNFU,
    familia,
    categoria,
    unidadMedida,
    almacen,
    bien
};