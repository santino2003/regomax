const commitCallbacks = new WeakMap();

function afterCommit(connection, callback) {
  const callbacks = commitCallbacks.get(connection);
  if (!callbacks) throw new Error('La conexión no pertenece a una transacción activa');
  callbacks.push(callback);
}

async function withTransaction(pool, work) {
  const connection = await pool.getConnection();
  const callbacks = [];
  commitCallbacks.set(connection, callbacks);
  let result;
  try {
    await connection.beginTransaction();
    result = await work(connection);
    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      // A broken connection cannot be safely returned to the pool.
      connection.destroy();
      error.rollbackError = rollbackError;
    }
    throw error;
  } finally {
    commitCallbacks.delete(connection);
    connection.release();
  }
  for (const callback of callbacks) {
    try {
      await callback();
    } catch (error) {
      console.error('Error en tarea posterior al commit:', error);
    }
  }
  return result;
}

module.exports = { withTransaction, afterCommit };
