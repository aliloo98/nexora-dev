// Storage Management with IndexedDB Support
const StorageManager = (() => {
  let useIndexedDB = false;
  let db = null;

  const getStorageFallback = () => {
    if (typeof SafeStorage !== 'undefined') {
      return SafeStorage;
    }
    return localStorage;
  };

  const initIndexedDB = async () => {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported, falling back to localStorage');
      return false;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('BudgetDB', 1);
        
        request.onerror = () => {
          console.warn('IndexedDB init failed, using localStorage');
          resolve(false);
        };

        request.onsuccess = () => {
          db = request.result;
          useIndexedDB = true;
          console.log('IndexedDB initialized');
          resolve(true);
        };

        request.onupgradeneeded = (event) => {
          const database = event.target.result;
          if (!database.objectStoreNames.contains('budgetData')) {
            database.createObjectStore('budgetData', { keyPath: 'key' });
          }
        };
      } catch (err) {
        console.warn('IndexedDB error:', err);
        resolve(false);
      }
    });
  };

  const setItem = async (key, value) => {
    if (useIndexedDB && db) {
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(['budgetData'], 'readwrite');
          transaction.objectStore('budgetData').put({ key, value });
          transaction.oncomplete = () => resolve(true);
          transaction.onerror = () => resolve(false);
        } catch (err) {
          getStorageFallback().setItem(key, value);
          resolve(false);
        }
      });
    } else {
      getStorageFallback().setItem(key, value);
      return Promise.resolve(true);
    }
  };

  const getItem = async (key) => {
    if (useIndexedDB && db) {
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(['budgetData'], 'readonly');
          const request = transaction.objectStore('budgetData').get(key);
          request.onsuccess = () => {
            resolve(request.result ? request.result.value : null);
          };
          request.onerror = () => resolve(getStorageFallback().getItem(key));
        } catch (err) {
          resolve(getStorageFallback().getItem(key));
        }
      });
    } else {
      return Promise.resolve(getStorageFallback().getItem(key));
    }
  };

  const removeItem = async (key) => {
    if (useIndexedDB && db) {
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(['budgetData'], 'readwrite');
          transaction.objectStore('budgetData').delete(key);
          transaction.oncomplete = () => resolve(true);
        } catch (err) {
          getStorageFallback().removeItem(key);
          resolve(false);
        }
      });
    } else {
      getStorageFallback().removeItem(key);
      return Promise.resolve(true);
    }
  };

  return {
    initIndexedDB,
    setItem,
    getItem,
    removeItem
  };
})();

export { StorageManager };

// Initialize on load
StorageManager.initIndexedDB().then(() => {
  console.log('Storage Manager ready');
});
