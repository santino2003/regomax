async function withTransaction(pool, work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
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
    connection.release();
  }
}

module.exports = { withTransaction };
