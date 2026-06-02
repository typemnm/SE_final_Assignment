// Web fallback: sessionStorage is scoped to the tab and cleared on close
const STORAGE =
  typeof sessionStorage !== 'undefined'
    ? sessionStorage
    : {getItem: () => null, setItem: () => {}, removeItem: () => {}};

const Keychain = {
  setGenericPassword: async (username, password, options = {}) => {
    const key = `kc_${options.service || 'default'}`;
    try {
      STORAGE.setItem(`${key}_u`, username);
      STORAGE.setItem(`${key}_p`, password);
      return true;
    } catch {
      return false;
    }
  },
  getGenericPassword: async (options = {}) => {
    const key = `kc_${options.service || 'default'}`;
    try {
      const password = STORAGE.getItem(`${key}_p`);
      if (!password) return false;
      const username = STORAGE.getItem(`${key}_u`) || '';
      return {username, password, service: options.service || 'default'};
    } catch {
      return false;
    }
  },
  resetGenericPassword: async (options = {}) => {
    const key = `kc_${options.service || 'default'}`;
    try {
      STORAGE.removeItem(`${key}_u`);
      STORAGE.removeItem(`${key}_p`);
      return true;
    } catch {
      return false;
    }
  },
};

export default Keychain;
export const {setGenericPassword, getGenericPassword, resetGenericPassword} = Keychain;
