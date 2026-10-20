const cache = CacheService.getScriptCache();

// Retrieves JSON-parsed data from the Apps Script cache for a given key.
// Returns `null` if the key is not found or cache has expired.
function getCachedData(key) {
  const data = cache.get(key);
  return data ? JSON.parse(data) : null;
}

// Stores JSON-stringified value in the Apps Script cache under the given key,
// with an optional expiration duration (default: CACHE_DURATION seconds).
// Skips caching if the value exceeds the 100KB per-key limit, so large datasets still sync.
function setCachedData(key, value, duration = CACHE_DURATION) {
  try {
    cache.put(key, JSON.stringify(value), duration);
  } catch (e) {
    console.log(`[FicTracker] Skipped caching "${key}": ${e.message}`);
  }
}

// Removes a specific key (default: 'sheet_data') from the Apps Script cache,
// effectively forcing a fresh read from the sheet on next access.
// Logs the invalidation for visibility/debugging.
function invalidateCache(key = 'sheet_data') {
  cache.remove(key);
  console.log(`[FicTracker] Cache invalidated for key "${key}"`);
}
