function createPoolOptions(env = process.env) {
  function integer(name, fallback, min = 1) {
    const value = env[name] === undefined || env[name] === '' ? fallback : Number(env[name]);
    if (!Number.isSafeInteger(value) || value < min) {
      throw new Error(`${name} debe ser un entero mayor o igual a ${min}`);
    }
    return value;
  }

  const connectionLimit = integer('DB_CONNECTION_LIMIT', 10);
  return {
    uri: env.DATABASE_URL,
    timezone: '-03:00',
    waitForConnections: true,
    connectionLimit,
    queueLimit: integer('DB_QUEUE_LIMIT', 10, 0),
    connectTimeout: integer('DB_CONNECT_TIMEOUT', 10000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    idleTimeout: integer('DB_IDLE_TIMEOUT', 15000),
    maxIdle: Math.min(2, connectionLimit)
  };
}

module.exports = { createPoolOptions };
