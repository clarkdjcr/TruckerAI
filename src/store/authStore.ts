import { create } from 'zustand';
import * as SecureStore from '../api/storage';
import { authApi } from '../api/client';
import { User, HOSData } from '../types';

interface AuthState {
  user: User | null;
  hos: HOSData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setHOS: (hos: HOSData) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hos: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(username, password);
      await SecureStore.setItemAsync('access_token', data.access);
      await SecureStore.setItemAsync('refresh_token', data.refresh);
      const meRes = await authApi.me();
      set({
        user: meRes.data,
        hos: data.hos ?? null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, hos: null, isAuthenticated: false });
  },

  refreshMe: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) return;
      const { data } = await authApi.me();
      set({ user: data, isAuthenticated: true });
    } catch {
      set({ isAuthenticated: false });
    }
  },

  setHOS: (hos) => set({ hos }),
}));