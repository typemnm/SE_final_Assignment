const AsyncStorage = {
  getItem: async (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key) => {
    try { localStorage.removeItem(key); } catch {}
  },
  clear: async () => {
    try { localStorage.clear(); } catch {}
  },
  getAllKeys: async () => {
    try { return Object.keys(localStorage); } catch { return []; }
  },
  multiGet: async (keys) => {
    return keys.map(k => [k, localStorage.getItem(k)]);
  },
  multiSet: async (keyValuePairs) => {
    keyValuePairs.forEach(([k, v]) => localStorage.setItem(k, v));
  },
  multiRemove: async (keys) => {
    keys.forEach(k => localStorage.removeItem(k));
  },
};

export default AsyncStorage;
