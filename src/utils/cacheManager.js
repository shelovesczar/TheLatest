/**
 * Enhanced caching manager using IndexedDB for persistent storage
 * This provides much better caching than localStorage (5MB limit)
 * IndexedDB can store hundreds of MBs
 */

const DB_NAME = 'TheLatestCache';
const DB_VERSION = 1;
const STORE_NAME = 'contentCache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

class CacheManager {
  constructor() {
    this.db = null;
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.initDB();
    }
    return this.db;
  }

  async get(key) {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }

          // Check if cache is still valid
          const age = Date.now() - result.timestamp;
          if (age > CACHE_DURATION) {
            console.log(`[Cache] ${key} expired (age: ${Math.round(age / 1000)}s)`);
            this.delete(key); // Clean up expired cache
            resolve(null);
            return;
          }

          console.log(`[Cache] HIT for ${key} (age: ${Math.round(age / 1000)}s)`);
          resolve(result.data);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[Cache] Error getting from cache:', error);
      return null;
    }
  }

  async set(key, data) {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({
          key,
          data,
          timestamp: Date.now()
        });

        request.onsuccess = () => {
          console.log(`[Cache] SET ${key} (${data?.length || 0} items)`);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[Cache] Error setting cache:', error);
    }
  }

  async delete(key) {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[Cache] Error deleting from cache:', error);
    }
  }

  async clear() {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('[Cache] Cleared all cache');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[Cache] Error clearing cache:', error);
    }
  }

  async getAllKeys() {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[Cache] Error getting keys:', error);
      return [];
    }
  }

  // Clean up old cache entries
  async cleanupOldCache() {
    try {
      const keys = await this.getAllKeys();
      const now = Date.now();
      
      for (const key of keys) {
        const item = await this.get(key);
        if (!item) {
          // Already expired and deleted by get()
          continue;
        }
      }
      
      console.log('[Cache] Cleanup complete');
    } catch (error) {
      console.error('[Cache] Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Run cleanup on initialization
cacheManager.cleanupOldCache();
