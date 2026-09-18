// Cache utility — simple in-memory TTL cache
const cache = new Map();

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function set(key, data, ttlMs = 60000) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function del(key) {
  cache.delete(key);
}

function clear() {
  cache.clear();
}

module.exports = { get, set, del, clear };
