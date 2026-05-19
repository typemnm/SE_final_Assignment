import AsyncStorage from '@react-native-async-storage/async-storage';

export const setStorage = async (key: string, value: string): Promise<void> => {
  await AsyncStorage.setItem(key, value);
};

export const getStorage = async (key: string): Promise<string | null> => {
  return AsyncStorage.getItem(key);
};

export const removeStorage = async (key: string): Promise<void> => {
  await AsyncStorage.removeItem(key);
};

export const clearStorage = async (): Promise<void> => {
  await AsyncStorage.clear();
};
