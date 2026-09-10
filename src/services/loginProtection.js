const { createHash } = require('node:crypto');

function createLoginProtection({ db, fetchImpl = (...args) => fetch(...args), env = process.env }) {
  let ready;
  async function init() {
    if (!ready) {
      ready = db.query(`CREATE TABLE IF NOT EXISTS login_attempts (
        ip_hash CHAR(64) PRIMARY KEY,
        failures INT UNSIGNED NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        INDEX (expires_at)
      )`).catch(error => { ready = undefined; throw error; });
    }
    await ready;
  }
  const key = req => createHash('sha256').update(req.ip || req.socket.remoteAddress || 'unknown').digest('hex');
  async function required(req) {
    await init();
    const rows = await db.query('SELECT failures FROM login_attempts WHERE ip_hash = ? AND expires_at > NOW()', [key(req)]);
    return rows.length > 0 && rows[0].failures >= 2;
  }
  return {
    required,
    siteKey: () => env.RECAPTCHA_SITE_KEY || '',
    async failed(req) {
      await init();
      await db.query('DELETE FROM login_attempts WHERE expires_at <= NOW() LIMIT 100');
      await db.query(`INSERT INTO login_attempts (ip_hash, failures, expires_at)
        VALUES (?, 1, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
        ON DUPLICATE KEY UPDATE
          failures = IF(expires_at <= NOW(), 1, LEAST(failures + 1, 1000000)),
          expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE)`, [key(req)]);
      return required(req);
    },
    async clear(req) {
      await init();
      await db.query('DELETE FROM login_attempts WHERE ip_hash = ?', [key(req)]);
    },
    async verify(token) {
      if (!env.RECAPTCHA_SECRET_KEY || !env.RECAPTCHA_SITE_KEY) {
        throw new Error('reCAPTCHA no configurado');
      }
      if (typeof token !== 'string' || !token || token.length > 10000) return false;
      const response = await fetchImpl('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret: env.RECAPTCHA_SECRET_KEY, response: token }),
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error('reCAPTCHA no disponible');
      const result = await response.json();
      return result.success === true;
    }
  };
}

module.exports = { createLoginProtection };
