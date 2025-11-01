const categoriaRepository = require('../repositories/categoriaRepository');

class CategoriaService {
    async crearCategoria(categoriaData) {
        try {
            const { nombre, responsable } = categoriaData;
            
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre de la categoria es obligatorio');
            }

            await categoriaRepository.crearCategoria(nombre.trim(), responsable);
            return {
                success: true,
                message: 'Categoria creada exitosamente',
            };
        } catch (error) {
            console.error('Error en CategoriaService.crearCategoria:', error);
            throw error;
        }
    }

    async modificarCategoria(id, nombre) {
        try {
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre de la categoria es obligatorio');
            }

            await categoriaRepository.modificarCategoria(id, nombre.trim());
            return {
                success: true,
                message: 'Categoria modificada exitosamente',
            };
        } catch (error) {
            console.error('Error en CategoriaService.modificarCategoria:', error);
            throw error;
        }
    }

    async eliminarCategoria(id) {
        try {
            await categoriaRepository.eliminarCategoria(id);
            return {
                success: true,
                message: 'Categoria eliminada exitosamente',
            };
        } catch (error) {
            console.error('Error en CategoriaService.eliminarCategoria:', error);
            throw error;
        }
    }   

    async obtenerTodas(page = 1, limit = 10) {
        try {
            const resultado = await categoriaRepository.obtenerTodas(page, limit);
            return resultado;
        } catch (error) {
            console.error('Error en CategoriaService.obtenerTodas:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const categoria = await categoriaRepository.obtenerPorId(id);
            if (!categoria) {
                throw new Error('Categoria no encontrada');
            }
            return categoria;
        } catch (error) {
            console.error('Error en CategoriaService.obtenerPorId:', error);
            throw error;
        }
    }
}

module.exports = new CategoriaService();
