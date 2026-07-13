import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store has no web implementation, so fall back to localStorage there.
export function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return Promise.resolve(localStorage.getItem(key));
  }
  return SecureStore.getItemAsync(key);
}

export function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }
  return SecureStore.setItemAsync(key, value);
}

export function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
  return SecureStore.deleteItemAsync(key);
}
