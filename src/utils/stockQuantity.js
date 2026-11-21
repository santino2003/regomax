function stockQuantity(value) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' ||
      !Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw new Error('La cantidad debe ser un número finito mayor a 0');
  }
  return Number(value);
}

module.exports = { stockQuantity };
